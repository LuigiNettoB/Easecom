from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal


@dataclass(frozen=True)
class ItemExterno:
    id_externo: str
    titulo: str
    sku: str
    quantidade: int
    preco_unitario: Decimal
    taxa_venda: Decimal


@dataclass(frozen=True)
class PedidoExterno:
    """Pedido de um marketplace já traduzido para o formato do hub."""

    id_externo: str
    status: str
    status_no_canal: str
    entregue: bool
    realizado_em: datetime
    valor_total: Decimal
    valor_pago: Decimal
    moeda: str
    comprador_id_externo: str
    comprador_apelido: str
    itens: list[ItemExterno]
