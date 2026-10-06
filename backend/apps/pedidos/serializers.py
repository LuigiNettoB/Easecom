from rest_framework import serializers

from apps.pedidos.models import ItemPedido, Pedido


class ValorField(serializers.DecimalField):
    """Valor monetário devolvido como número JSON (e não string)."""

    def __init__(self, **kwargs):
        super().__init__(max_digits=12, decimal_places=2, coerce_to_string=False, **kwargs)


class ItemPedidoSaidaSerializer(serializers.ModelSerializer):
    preco_unitario = ValorField()
    taxa_venda = ValorField()

    class Meta:
        model = ItemPedido
        fields = ["id", "id_externo", "titulo", "sku", "quantidade", "preco_unitario", "taxa_venda"]


class PedidoSaidaSerializer(serializers.ModelSerializer):
    canal_nome = serializers.CharField(source="get_canal_display")
    valor_total = ValorField()
    valor_pago = ValorField()
    itens = ItemPedidoSaidaSerializer(many=True)

    class Meta:
        model = Pedido
        fields = [
            "id",
            "canal",
            "canal_nome",
            "id_externo",
            "status",
            "status_no_canal",
            "entregue",
            "realizado_em",
            "valor_total",
            "valor_pago",
            "moeda",
            "comprador_apelido",
            "itens",
            "sincronizado_em",
        ]


class SincronizacaoCanalSaidaSerializer(serializers.Serializer):
    canal = serializers.CharField()
    criados = serializers.IntegerField()
    atualizados = serializers.IntegerField()


class SincronizacaoSaidaSerializer(serializers.Serializer):
    canais = SincronizacaoCanalSaidaSerializer(many=True)


class ResumoCanalSaidaSerializer(serializers.Serializer):
    canal = serializers.CharField()
    canal_nome = serializers.CharField()
    total_pedidos = serializers.IntegerField()
    receita_total = ValorField()


class ProdutoMaisVendidoSaidaSerializer(serializers.Serializer):
    id_externo = serializers.CharField()
    titulo = serializers.CharField()
    sku = serializers.CharField()
    quantidade = serializers.IntegerField()


class ResumoVendasSaidaSerializer(serializers.Serializer):
    total_pedidos = serializers.IntegerField()
    receita_total = ValorField()
    pedidos_por_status = serializers.DictField(child=serializers.IntegerField())
    por_canal = ResumoCanalSaidaSerializer(many=True)
    produtos_mais_vendidos = ProdutoMaisVendidoSaidaSerializer(many=True)
    ultima_sincronizacao = serializers.DateTimeField(allow_null=True)
