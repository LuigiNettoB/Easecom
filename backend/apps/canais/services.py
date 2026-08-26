import json
from collections import Counter
from functools import lru_cache
from pathlib import Path

CAMINHO_FIXTURE = Path(__file__).resolve().parent / "fixtures" / "mercado_livre.json"

QUANTIDADE_TOP_PRODUTOS = 5
QUANTIDADE_PEDIDOS_RECENTES = 5


@lru_cache
def _carregar_dados_simulados() -> dict:
    """Lê o fixture estático que simula a API do Mercado Livre.

    Endpoint temporário para testar a integração com o front — não é um
    módulo de negócio real, não persiste nada, não tem multi-tenancy.
    """
    with open(CAMINHO_FIXTURE, encoding="utf-8") as arquivo:
        return json.load(arquivo)


def obter_resumo_mercado_livre() -> dict:
    dados = _carregar_dados_simulados()

    pedidos = dados["pedidos"]
    receita_total = round(sum(pedido["paid_amount"] for pedido in pedidos), 2)
    pedidos_por_status = dict(Counter(pedido["status"] for pedido in pedidos))

    top_produtos = sorted(dados["anuncios"], key=lambda a: a["sold_quantity"], reverse=True)[
        :QUANTIDADE_TOP_PRODUTOS
    ]
    pedidos_recentes = sorted(pedidos, key=lambda p: p["date_created"], reverse=True)[
        :QUANTIDADE_PEDIDOS_RECENTES
    ]

    return {
        "vendedor_nickname": dados["usuario"]["nickname"],
        "nivel_reputacao": dados["usuario"]["seller_reputation"]["level_id"],
        "totais": dados["_meta"]["totais"],
        "receita_total": receita_total,
        "pedidos_por_status": pedidos_por_status,
        "top_produtos": top_produtos,
        "pedidos_recentes": pedidos_recentes,
    }
