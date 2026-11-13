from collections.abc import Iterator
from datetime import datetime
from decimal import Decimal

import requests

from apps.canais.models import MercadoLivreToken
from apps.canais.services import chamar_api_mercado_livre, esta_conectado_ao_mercado_livre
from apps.contas.models import Vendedor
from apps.core.exceptions import ErroDeNegocio
from apps.pedidos.adaptadores.base import ItemExterno, PedidoExterno
from apps.pedidos.models import Canal, StatusPedido

CANAL = Canal.MERCADO_LIVRE

TAMANHO_PAGINA = 50

STATUS_POR_STATUS_ML = {
    "paid": StatusPedido.PAGO,
    "partially_refunded": StatusPedido.PAGO,
    "confirmed": StatusPedido.PENDENTE,
    "payment_required": StatusPedido.PENDENTE,
    "payment_in_process": StatusPedido.PENDENTE,
    "partially_paid": StatusPedido.PENDENTE,
    "pending_cancel": StatusPedido.CANCELADO,
    "cancelled": StatusPedido.CANCELADO,
    "invalid": StatusPedido.CANCELADO,
}


def esta_conectado(*, vendedor: Vendedor) -> bool:
    return esta_conectado_ao_mercado_livre(vendedor=vendedor)


def buscar_pedidos(*, vendedor: Vendedor) -> Iterator[PedidoExterno]:
    """Percorre todas as vendas da conta do Mercado Livre do vendedor."""
    ml_user_id = MercadoLivreToken.objects_todos.get(vendedor=vendedor).ml_user_id
    offset = 0
    while True:
        try:
            resposta = chamar_api_mercado_livre(
                vendedor=vendedor,
                caminho="/orders/search",
                params={
                    "seller": ml_user_id,
                    "sort": "date_desc",
                    "limit": TAMANHO_PAGINA,
                    "offset": offset,
                },
            )
        except requests.RequestException as exc:
            raise ErroDeNegocio(
                mensagem="Não foi possível buscar os pedidos no Mercado Livre agora.",
                codigo="ml_indisponivel",
                status_code=502,
            ) from exc

        dados = resposta.json()
        pedidos = dados.get("results", [])
        for pedido in pedidos:
            yield _traduzir_pedido(pedido)

        offset += TAMANHO_PAGINA
        if not pedidos or offset >= dados.get("paging", {}).get("total", 0):
            return


def _decimal(valor) -> Decimal:
    return Decimal(str(valor or 0))


def _traduzir_pedido(pedido: dict) -> PedidoExterno:
    comprador = pedido.get("buyer") or {}
    return PedidoExterno(
        id_externo=str(pedido["id"]),
        status=STATUS_POR_STATUS_ML.get(pedido["status"], StatusPedido.OUTRO),
        status_no_canal=pedido["status"],
        entregue="delivered" in pedido.get("tags", []),
        realizado_em=datetime.fromisoformat(pedido["date_created"]),
        valor_total=_decimal(pedido.get("total_amount")),
        valor_pago=_decimal(pedido.get("paid_amount")),
        moeda=pedido.get("currency_id") or "",
        comprador_id_externo=str(comprador.get("id") or ""),
        comprador_apelido=comprador.get("nickname") or "",
        itens=[_traduzir_item(item) for item in pedido.get("order_items", [])],
    )


def _traduzir_item(item: dict) -> ItemExterno:
    anuncio = item.get("item") or {}
    return ItemExterno(
        id_externo=str(anuncio.get("id") or ""),
        titulo=(anuncio.get("title") or "")[:255],
        sku=anuncio.get("seller_sku") or "",
        quantidade=item.get("quantity") or 0,
        preco_unitario=_decimal(item.get("unit_price")),
        taxa_venda=_decimal(item.get("sale_fee")),
    )
