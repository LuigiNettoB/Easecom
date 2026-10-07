from django.db import models

from apps.core.models import ModeloBase, ModeloMultiTenant


class Canal(models.TextChoices):
    MERCADO_LIVRE = "MERCADO_LIVRE", "Mercado Livre"
    SHOPEE = "SHOPEE", "Shopee"
    AMAZON = "AMAZON", "Amazon"
    MAGALU = "MAGALU", "Magalu"


class StatusPedido(models.TextChoices):
    PENDENTE = "PENDENTE", "Pendente"
    PAGO = "PAGO", "Pago"
    CANCELADO = "CANCELADO", "Cancelado"
    OUTRO = "OUTRO", "Outro"


class Pedido(ModeloMultiTenant):
    """Uma venda do vendedor, em formato único para qualquer canal.

    É uma cópia do pedido que vive no marketplace, gravada pela
    sincronização (`apps.pedidos.services.sincronizar_pedidos`) — nunca é
    editada à mão. `status` é o status padronizado do hub; `status_no_canal`
    guarda o valor original do marketplace.
    """

    canal = models.CharField(max_length=30, choices=Canal.choices)
    id_externo = models.CharField(max_length=64)
    status = models.CharField(max_length=20, choices=StatusPedido.choices)
    status_no_canal = models.CharField(max_length=50)
    entregue = models.BooleanField(default=False)
    realizado_em = models.DateTimeField()
    valor_total = models.DecimalField(max_digits=12, decimal_places=2)
    valor_pago = models.DecimalField(max_digits=12, decimal_places=2)
    moeda = models.CharField(max_length=3)
    comprador_id_externo = models.CharField(max_length=64, blank=True)
    comprador_apelido = models.CharField(max_length=150, blank=True)
    sincronizado_em = models.DateTimeField()

    class Meta:
        ordering = ["-realizado_em"]
        constraints = [
            models.UniqueConstraint(
                fields=["vendedor", "canal", "id_externo"], name="pedido_unico_por_canal"
            ),
        ]

    def __str__(self):
        return f"{self.get_canal_display()} {self.id_externo}"


class ItemPedido(ModeloBase):
    pedido = models.ForeignKey(Pedido, on_delete=models.CASCADE, related_name="itens")
    id_externo = models.CharField(max_length=64)
    titulo = models.CharField(max_length=255)
    sku = models.CharField(max_length=100, blank=True)
    quantidade = models.PositiveIntegerField()
    preco_unitario = models.DecimalField(max_digits=12, decimal_places=2)
    taxa_venda = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        ordering = ["criado_em"]

    def __str__(self):
        return f"{self.quantidade}x {self.titulo}"
