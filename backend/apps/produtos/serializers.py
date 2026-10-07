from rest_framework import serializers

from apps.pedidos.models import Canal
from apps.produtos.models import Produto


class ValorField(serializers.DecimalField):
    """Valor monetário como número JSON (e não string)."""

    def __init__(self, **kwargs):
        super().__init__(max_digits=12, decimal_places=2, coerce_to_string=False, **kwargs)


class ProdutoEntradaSerializer(serializers.Serializer):
    """Payload de criação/atualização de um produto."""

    nome = serializers.CharField(max_length=255)
    sku = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    categoria = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    preco = ValorField(required=False, min_value=0, default=0)
    estoque = serializers.IntegerField(required=False, min_value=0, default=0)
    canais = serializers.ListField(
        child=serializers.ChoiceField(choices=Canal.choices),
        required=False,
        allow_empty=True,
        default=list,
    )
    foto_url = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
    fornecedor_id = serializers.UUIDField(required=False, allow_null=True, default=None)


class ProdutoSaidaSerializer(serializers.ModelSerializer):
    preco = ValorField()
    canais = serializers.SerializerMethodField()
    canais_nome = serializers.SerializerMethodField()
    fornecedor_id = serializers.UUIDField(source="fornecedor_id", read_only=True, allow_null=True)
    fornecedor_nome = serializers.SerializerMethodField()

    class Meta:
        model = Produto
        fields = [
            "id",
            "nome",
            "sku",
            "categoria",
            "preco",
            "estoque",
            "canais",
            "canais_nome",
            "foto_url",
            "fornecedor_id",
            "fornecedor_nome",
            "criado_em",
            "atualizado_em",
        ]

    def get_canais(self, obj):
        return [relacao.canal for relacao in obj.canais_relacionados.all()]

    def get_canais_nome(self, obj):
        return [relacao.get_canal_display() for relacao in obj.canais_relacionados.all()]

    def get_fornecedor_nome(self, obj):
        return obj.fornecedor.nome if obj.fornecedor else None


class EstoqueResumoSaidaSerializer(serializers.Serializer):
    """Indicadores de estoque da tela do catálogo/estoque."""

    total_produtos = serializers.IntegerField()
    unidades_totais = serializers.IntegerField()
    produtos_estoque_baixo = serializers.IntegerField()
    valor_estoque = ValorField()
