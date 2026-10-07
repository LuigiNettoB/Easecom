from django.db import models

from apps.core.models import ModeloBase, ModeloMultiTenant
from apps.pedidos.models import Canal


class Produto(ModeloMultiTenant):
    """Um item do catálogo do vendedor, com estoque e canais onde é anunciado.

    `foto_url` guarda a URL devolvida pelo upload em `apps.arquivos`
    (`POST /api/v1/arquivos`) — o conteúdo em si fica no Supabase Storage.
    """

    nome = models.CharField(max_length=255)
    sku = models.CharField(max_length=100, blank=True)
    categoria = models.CharField(max_length=100, blank=True)
    preco = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    estoque = models.PositiveIntegerField(default=0)
    foto_url = models.CharField(max_length=500, blank=True)
    fornecedor = models.ForeignKey(
        "fornecedores.Fornecedor",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="produtos",
    )

    class Meta:
        ordering = ["nome"]
        constraints = [
            models.UniqueConstraint(
                fields=["vendedor", "sku"], name="produto_sku_unico_por_vendedor"
            ),
        ]

    def __str__(self):
        return self.nome


class ProdutoCanal(ModeloBase):
    """Canal em que um produto está anunciado (Mercado Livre, Shopee...).

    É uma tabela filha de `Produto` (como `ItemPedido` é de `Pedido`), por
    isso não herda de `ModeloMultiTenant` — o isolamento vem do produto pai.
    """

    produto = models.ForeignKey(
        Produto,
        on_delete=models.CASCADE,
        related_name="canais_relacionados",
    )
    canal = models.CharField(max_length=30, choices=Canal.choices)

    class Meta:
        ordering = ["canal"]
        constraints = [
            models.UniqueConstraint(fields=["produto", "canal"], name="produto_canal_unico"),
        ]

    def __str__(self):
        return f"{self.produto} em {self.get_canal_display()}"
