"""Consultas de leitura que o assistente pode usar para responder.

Todas recebem o `vendedor` vindo da requisição autenticada — nunca da IA —
e filtram explicitamente por ele, então uma resposta nunca mistura dados de
vendedores diferentes. Os resultados são dicionários simples (números como
float, datas em ISO) prontos para virar JSON. Dados de compradores não são
devolvidos.
"""

from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.db.models import Count, F, Sum
from django.db.models.functions import TruncDay, TruncMonth, TruncWeek
from django.utils import timezone

from apps.financeiro.services import obter_resumo_financeiro
from apps.pedidos.models import Canal, ItemPedido, Pedido, StatusPedido
from apps.produtos.models import Produto
from apps.produtos.services import LIMITE_ESTOQUE_BAIXO, obter_resumo_estoque

DIAS_PERIODO_PADRAO = 30
LIMITE_MAXIMO_LISTA = 20
AGRUPAMENTOS = {"dia": TruncDay, "semana": TruncWeek, "mes": TruncMonth}


class ParametroInvalido(ValueError):
    """Parâmetro de consulta inválido — a mensagem volta para a IA corrigir."""


def resumo_vendas(*, vendedor, de=None, ate=None) -> dict:
    inicio, fim = _periodo(de, ate)
    pedidos = _pedidos(vendedor, inicio, fim)
    pagos = pedidos.filter(status=StatusPedido.PAGO)
    receita = pagos.aggregate(total=Sum("valor_pago"))["total"] or Decimal("0")
    total_pagos = pagos.count()
    itens = ItemPedido.objects.filter(pedido__in=pagos).aggregate(
        unidades=Sum("quantidade"), taxas=Sum("taxa_venda")
    )
    return {
        "periodo": _periodo_em_texto(inicio, fim),
        "receita": _numero(receita),
        "pedidos_pagos": total_pagos,
        "pedidos_cancelados": pedidos.filter(status=StatusPedido.CANCELADO).count(),
        "pedidos_pendentes": pedidos.filter(status=StatusPedido.PENDENTE).count(),
        "total_pedidos": pedidos.count(),
        "ticket_medio": _numero(receita / total_pagos) if total_pagos else 0.0,
        "unidades_vendidas": itens["unidades"] or 0,
        "taxas_marketplace": _numero(itens["taxas"]),
        "observacao": "Receita considera só pedidos pagos.",
    }


def vendas_por_canal(*, vendedor, de=None, ate=None) -> dict:
    inicio, fim = _periodo(de, ate)
    pagos = _pedidos(vendedor, inicio, fim).filter(status=StatusPedido.PAGO)
    linhas = list(
        pagos.values("canal")
        .annotate(pedidos=Count("id"), receita=Sum("valor_pago"))
        .order_by("-receita")
    )
    receita_total = sum((linha["receita"] or Decimal("0")) for linha in linhas)
    return {
        "periodo": _periodo_em_texto(inicio, fim),
        "receita_total": _numero(receita_total),
        "canais": [
            {
                "canal": Canal(linha["canal"]).label,
                "pedidos_pagos": linha["pedidos"],
                "receita": _numero(linha["receita"]),
                "ticket_medio": _numero(linha["receita"] / linha["pedidos"]),
                "participacao_percentual": (
                    _numero(linha["receita"] / receita_total * 100) if receita_total else 0.0
                ),
            }
            for linha in linhas
        ],
    }


def vendas_por_periodo(*, vendedor, de=None, ate=None, agrupamento="mes") -> dict:
    if agrupamento not in AGRUPAMENTOS:
        raise ParametroInvalido("agrupamento deve ser 'dia', 'semana' ou 'mes'.")
    inicio, fim = _periodo(de, ate, dias_padrao=180 if agrupamento == "mes" else 30)
    truncar = AGRUPAMENTOS[agrupamento]
    linhas = (
        _pedidos(vendedor, inicio, fim)
        .filter(status=StatusPedido.PAGO)
        .annotate(inicio_periodo=truncar("realizado_em", tzinfo=timezone.get_current_timezone()))
        .values("inicio_periodo")
        .annotate(pedidos=Count("id"), receita=Sum("valor_pago"))
        .order_by("inicio_periodo")
    )
    return {
        "periodo": _periodo_em_texto(inicio, fim),
        "agrupamento": agrupamento,
        "serie": [
            {
                "inicio": linha["inicio_periodo"].date().isoformat(),
                "pedidos_pagos": linha["pedidos"],
                "receita": _numero(linha["receita"]),
            }
            for linha in linhas
        ],
        "observacao": "Períodos sem venda paga não aparecem na série.",
    }


def produtos_mais_vendidos(*, vendedor, de=None, ate=None, limite=5, ordenar_por="quantidade"):
    if ordenar_por not in ("quantidade", "receita"):
        raise ParametroInvalido("ordenar_por deve ser 'quantidade' ou 'receita'.")
    inicio, fim = _periodo(de, ate)
    pagos = _pedidos(vendedor, inicio, fim).filter(status=StatusPedido.PAGO)
    linhas = (
        ItemPedido.objects.filter(pedido__in=pagos)
        .values("titulo", "sku")
        # nomes diferentes dos campos: "quantidade" aqui colidiria com ItemPedido.quantidade
        .annotate(
            unidades=Sum("quantidade"),
            receita=Sum(F("quantidade") * F("preco_unitario")),
        )
        .order_by("-unidades" if ordenar_por == "quantidade" else "-receita", "titulo")[
            : _limite(limite)
        ]
    )
    return {
        "periodo": _periodo_em_texto(inicio, fim),
        "ordenado_por": ordenar_por,
        "produtos": [
            {
                "produto": linha["titulo"],
                "sku": linha["sku"],
                "unidades_vendidas": linha["unidades"],
                "receita": _numero(linha["receita"]),
            }
            for linha in linhas
        ],
    }


def listar_pedidos(*, vendedor, de=None, ate=None, status=None, canal=None, limite=10) -> dict:
    inicio, fim = _periodo(de, ate)
    pedidos = _pedidos(vendedor, inicio, fim).annotate(quantidade_itens=Sum("itens__quantidade"))
    if status:
        if status not in StatusPedido.values:
            raise ParametroInvalido(f"status deve ser um de {StatusPedido.values}.")
        pedidos = pedidos.filter(status=status)
    if canal:
        if canal not in Canal.values:
            raise ParametroInvalido(f"canal deve ser um de {Canal.values}.")
        pedidos = pedidos.filter(canal=canal)
    total = pedidos.count()
    return {
        "periodo": _periodo_em_texto(inicio, fim),
        "total_encontrado": total,
        "pedidos": [
            {
                "numero": pedido.id_externo,
                "canal": pedido.get_canal_display(),
                "status": pedido.get_status_display(),
                "data": timezone.localtime(pedido.realizado_em).strftime("%Y-%m-%d %H:%M"),
                "valor": _numero(pedido.valor_total),
                "itens": pedido.quantidade_itens or 0,
            }
            for pedido in pedidos.order_by("-realizado_em")[: _limite(limite, padrao=10)]
        ],
    }


def resumo_financeiro(*, vendedor, de=None, ate=None) -> dict:
    inicio, fim = _periodo(de, ate)
    resumo = obter_resumo_financeiro(vendedor=vendedor, realizado_de=inicio, realizado_ate=fim)
    return {
        "periodo": _periodo_em_texto(inicio, fim),
        "receitas": _numero(resumo["receitas"]),
        "despesas": _numero(resumo["despesas"]),
        "taxas_marketplace": _numero(resumo["taxas"]),
        "lucro_estimado": _numero(resumo["receitas"] - resumo["despesas"] - resumo["taxas"]),
        "margem_liquida_percentual": _numero(resumo["margem_liquida"]),
        "observacao": "Receitas vêm dos pedidos pagos; despesas, dos lançamentos manuais.",
    }


def resumo_estoque(*, vendedor) -> dict:
    resumo = obter_resumo_estoque(vendedor=vendedor)
    return {
        "total_produtos": resumo["total_produtos"],
        "unidades_em_estoque": resumo["unidades_totais"],
        "produtos_com_estoque_baixo": resumo["produtos_estoque_baixo"],
        "valor_do_estoque": _numero(resumo["valor_estoque"]),
        "criterio_estoque_baixo": f"até {LIMITE_ESTOQUE_BAIXO} unidades",
    }


def produtos_estoque_baixo(*, vendedor, limite=10) -> dict:
    produtos = Produto.objects_todos.filter(
        vendedor=vendedor, estoque__lte=LIMITE_ESTOQUE_BAIXO
    ).order_by("estoque", "nome")
    return {
        "criterio": f"até {LIMITE_ESTOQUE_BAIXO} unidades",
        "total_encontrado": produtos.count(),
        "produtos": [
            {
                "produto": produto.nome,
                "sku": produto.sku,
                "estoque": produto.estoque,
                "preco": _numero(produto.preco),
            }
            for produto in produtos[: _limite(limite, padrao=10)]
        ],
    }


def _pedidos(vendedor, inicio, fim):
    return Pedido.objects_todos.filter(
        vendedor=vendedor, realizado_em__gte=inicio, realizado_em__lte=fim
    )


def _periodo(de, ate, dias_padrao=DIAS_PERIODO_PADRAO):
    """Converte datas 'AAAA-MM-DD' (inclusivas) em datetimes no fuso local."""
    hoje = timezone.localdate()
    data_fim = _data(ate, "ate") if ate else hoje
    data_inicio = _data(de, "de") if de else data_fim - timedelta(days=dias_padrao - 1)
    if data_inicio > data_fim:
        raise ParametroInvalido("A data 'de' não pode ser depois da data 'ate'.")
    fuso = timezone.get_current_timezone()
    return (
        timezone.make_aware(datetime.combine(data_inicio, time.min), fuso),
        timezone.make_aware(datetime.combine(data_fim, time.max), fuso),
    )


def _data(valor, nome) -> date:
    try:
        return date.fromisoformat(str(valor))
    except ValueError as exc:
        raise ParametroInvalido(f"'{nome}' deve estar no formato AAAA-MM-DD.") from exc


def _periodo_em_texto(inicio, fim) -> dict:
    return {"de": inicio.date().isoformat(), "ate": fim.date().isoformat()}


def _limite(valor, padrao=5) -> int:
    try:
        numero = int(valor) if valor is not None else padrao
    except (TypeError, ValueError):
        numero = padrao
    return max(1, min(numero, LIMITE_MAXIMO_LISTA))


def _numero(valor) -> float:
    return float(round(Decimal(valor or 0), 2))
