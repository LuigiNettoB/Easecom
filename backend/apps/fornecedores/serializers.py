from rest_framework import serializers

from apps.fornecedores.models import Fornecedor
from apps.produtos.models import Produto


class FornecedorEntradaSerializer(serializers.Serializer):
    """Payload de criação/atualização de um fornecedor."""

    nome = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True, default="")
    ativo = serializers.BooleanField(required=False, default=True)


class FornecedorSaidaSerializer(serializers.ModelSerializer):
    produtos_vinculados = serializers.SerializerMethodField()

    class Meta:
        model = Fornecedor
        fields = [
            "id",
            "nome",
            "email",
            "ativo",
            "produtos_vinculados",
            "criado_em",
            "atualizado_em",
        ]

    def get_produtos_vinculados(self, obj):
        # `Produto.objects` já filtra pelo vendedor da requisição
        return Produto.objects.filter(fornecedor=obj).count()
