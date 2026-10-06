from decimal import Decimal

from django.db import transaction
from django.db.models import Count, Max, Sum
from django.utils import timezone

from apps.contas.models import Vendedor
from apps.core.exceptions import ErroDeNegocio
from apps.pedidos.adaptadores import ADAPTADORES
from apps.pedidos.adaptadores.base import PedidoExterno
from apps.pedidos.models import Canal, ItemPedido, Pedido, StatusPedido

QUANTIDADE_PRODUTOS_MAIS_VENDIDOS = 5


def sincronizar_pedidos(*, vendedor: Vendedor) -> list[dict]:
    """Copia para o banco os pedidos de todos os canais conectados do vendedor.

    Pode ser executada quantas vezes for preciso: pedidos já copiados são
    atualizados, nunca duplicados.
    """
    resultados = []
    for adaptador in ADAPTADORES:
        if not adaptador.esta_conectado(vendedor=vendedor):
            continue

        criados = atualizados = 0
        for pedido_externo in adaptador.buscar_pedidos(vendedor=vendedor):
            if _gravar_pedido(vendedor=vendedor, canal=adaptador.CANAL, externo=pedido_externo):
                criados += 1
            else:
                atualizados += 1
        resultados.append(
            {"canal": adaptador.CANAL, "criados": criados, "atualizados": atualizados}
        )

    if not resultados:
        raise ErroDeNegocio(
            mensagem="Nenhum canal de venda conectado. Conecte um canal antes de sincronizar.",
            codigo="nenhum_canal_conectado",
            status_code=409,
        )
    return resultados


@transaction.atomic
def _gravar_pedido(*, vendedor: Vendedor, canal: str, externo: PedidoExterno) -> bool:
    pedido, criado = Pedido.objects_todos.update_or_create(
        vendedor=vendedor,
        canal=canal,
        id_externo=externo.id_externo,
        defaults={
            "status": externo.status,
            "status_no_canal": externo.status_no_canal,
            "entregue": externo.entregue,
            "realizado_em": externo.realizado_em,
            "valor_total": externo.valor_total,
            "valor_pago": externo.valor_pago,
            "moeda": externo.moeda,
            "comprador_id_externo": externo.comprador_id_externo,
            "comprador_apelido": externo.comprador_apelido,
            "sincronizado_em": timezone.now(),
        },
    )
    pedido.itens.all().delete()
    ItemPedido.objects.bulk_create(
        ItemPedido(
            pedido=pedido,
            id_externo=item.id_externo,
            titulo=item.titulo,
            sku=item.sku,
            quantidade=item.quantidade,
            preco_unitario=item.preco_unitario,
            taxa_venda=item.taxa_venda,
        )
        for item in externo.itens
    )
    return criado


def obter_resumo_vendas(*, vendedor: Vendedor) -> dict:
    """Totais de venda do vendedor, somando todos os canais."""
    pedidos = Pedido.objects_todos.filter(vendedor=vendedor)
    pagos = pedidos.filter(status=StatusPedido.PAGO)

    receita_por_canal = dict(
        pagos.values("canal").annotate(receita=Sum("valor_pago")).values_list("canal", "receita")
    )
    por_canal = [
        {
            "canal": linha["canal"],
            "canal_nome": Canal(linha["canal"]).label,
            "total_pedidos": linha["total_pedidos"],
            "receita_total": receita_por_canal.get(linha["canal"], Decimal("0")),
        }
        for linha in pedidos.values("canal").annotate(total_pedidos=Count("id")).order_by("canal")
    ]
    produtos_mais_vendidos = (
        ItemPedido.objects.filter(pedido__in=pagos)
        .values("id_externo", "titulo", "sku")
        .annotate(quantidade=Sum("quantidade"))
        .order_by("-quantidade", "titulo")[:QUANTIDADE_PRODUTOS_MAIS_VENDIDOS]
    )

    return {
        "total_pedidos": pedidos.count(),
        "receita_total": pagos.aggregate(total=Sum("valor_pago"))["total"] or Decimal("0"),
        "pedidos_por_status": {
            linha["status"]: linha["total"]
            for linha in pedidos.values("status").annotate(total=Count("id")).order_by("status")
        },
        "por_canal": por_canal,
        "produtos_mais_vendidos": list(produtos_mais_vendidos),
        "ultima_sincronizacao": pedidos.aggregate(ultima=Max("sincronizado_em"))["ultima"],
    }
