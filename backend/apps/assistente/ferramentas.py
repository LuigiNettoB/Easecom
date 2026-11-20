"""Ferramentas que a IA pode pedir para o backend executar.

A IA só escolhe *qual* consulta rodar e com quais filtros; quem executa é o
backend, sempre com o vendedor da requisição. Um pedido inválido da IA
(ferramenta inexistente, JSON quebrado, parâmetro errado) vira uma mensagem
de erro devolvida a ela, para que corrija — nunca uma exceção para o usuário.
"""

import json
import logging

from apps.assistente import consultas
from apps.pedidos.models import Canal, StatusPedido

logger = logging.getLogger(__name__)

_DE = {"type": "string", "description": "Data inicial, inclusiva, no formato AAAA-MM-DD."}
_ATE = {"type": "string", "description": "Data final, inclusiva, no formato AAAA-MM-DD."}
_LIMITE = {"type": "integer", "description": "Quantidade máxima de itens (1 a 20)."}


def _ferramenta(nome, descricao, propriedades=None):
    return {
        "type": "function",
        "function": {
            "name": nome,
            "description": descricao,
            "parameters": {"type": "object", "properties": propriedades or {}},
        },
    }


DEFINICOES = [
    _ferramenta(
        "resumo_vendas",
        "Totais de vendas num período: receita (só pedidos pagos), número de pedidos "
        "pagos/cancelados/pendentes, ticket médio, unidades vendidas e taxas dos "
        "marketplaces. Sem datas, usa os últimos 30 dias.",
        {"de": _DE, "ate": _ATE},
    ),
    _ferramenta(
        "vendas_por_canal",
        "Receita, pedidos pagos, ticket médio e participação (%) de cada canal de venda "
        "(Mercado Livre, Shopee, Amazon, Magalu) num período. Use para comparar canais.",
        {"de": _DE, "ate": _ATE},
    ),
    _ferramenta(
        "vendas_por_periodo",
        "Série de receita e pedidos pagos agrupada por dia, semana ou mês. Use para "
        "evolução, tendências, crescimento ou queda de vendas e para comparar meses.",
        {
            "de": _DE,
            "ate": _ATE,
            "agrupamento": {"type": "string", "enum": ["dia", "semana", "mes"]},
        },
    ),
    _ferramenta(
        "produtos_mais_vendidos",
        "Ranking dos produtos mais vendidos num período, por unidades ou por receita.",
        {
            "de": _DE,
            "ate": _ATE,
            "limite": _LIMITE,
            "ordenar_por": {"type": "string", "enum": ["quantidade", "receita"]},
        },
    ),
    _ferramenta(
        "listar_pedidos",
        "Lista pedidos (número, canal, status, data, valor, itens) do mais recente ao mais "
        "antigo, com filtros opcionais. Também informa o total encontrado.",
        {
            "de": _DE,
            "ate": _ATE,
            "status": {"type": "string", "enum": list(StatusPedido.values)},
            "canal": {"type": "string", "enum": list(Canal.values)},
            "limite": _LIMITE,
        },
    ),
    _ferramenta(
        "resumo_financeiro",
        "Receitas, despesas, taxas dos marketplaces, lucro estimado e margem líquida (%) "
        "num período. Use para perguntas sobre lucro, custos e margem.",
        {"de": _DE, "ate": _ATE},
    ),
    _ferramenta(
        "resumo_estoque",
        "Situação atual do estoque: total de produtos, unidades, valor do estoque e "
        "quantos produtos estão com estoque baixo.",
    ),
    _ferramenta(
        "produtos_estoque_baixo",
        "Lista os produtos com estoque baixo, do menor estoque para o maior.",
        {"limite": _LIMITE},
    ),
]

_CONSULTAS = {
    "resumo_vendas": consultas.resumo_vendas,
    "vendas_por_canal": consultas.vendas_por_canal,
    "vendas_por_periodo": consultas.vendas_por_periodo,
    "produtos_mais_vendidos": consultas.produtos_mais_vendidos,
    "listar_pedidos": consultas.listar_pedidos,
    "resumo_financeiro": consultas.resumo_financeiro,
    "resumo_estoque": consultas.resumo_estoque,
    "produtos_estoque_baixo": consultas.produtos_estoque_baixo,
}

_PARAMETROS_ACEITOS = {
    definicao["function"]["name"]: set(definicao["function"]["parameters"]["properties"])
    for definicao in DEFINICOES
}


def executar(*, nome: str, argumentos_json: str, vendedor) -> str:
    """Roda a consulta pedida pela IA e devolve o resultado em JSON (texto)."""
    consulta = _CONSULTAS.get(nome)
    if consulta is None:
        return _erro(f"A ferramenta '{nome}' não existe.")

    try:
        argumentos = json.loads(argumentos_json or "{}")
    except json.JSONDecodeError:
        return _erro("Os argumentos não são um JSON válido.")
    if not isinstance(argumentos, dict):
        return _erro("Os argumentos devem ser um objeto JSON.")

    # parâmetros desconhecidos (e qualquer tentativa de escolher o vendedor) são descartados
    aceitos = {
        chave: valor
        for chave, valor in argumentos.items()
        if chave in _PARAMETROS_ACEITOS[nome] and valor not in (None, "")
    }
    try:
        resultado = consulta(vendedor=vendedor, **aceitos)
    except consultas.ParametroInvalido as exc:
        return _erro(str(exc))
    except Exception:
        logger.exception("Falha ao executar a ferramenta %s do assistente", nome)
        return _erro("Falha interna ao consultar os dados. Avise o usuário.")
    return json.dumps(resultado, ensure_ascii=False)


def _erro(mensagem: str) -> str:
    return json.dumps({"erro": mensagem}, ensure_ascii=False)
