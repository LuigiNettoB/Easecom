from rest_framework import serializers

from apps.financeiro.models import Lancamento, TipoLancamento
from apps.pedidos.models import Canal


class ValorField(serializers.DecimalField):
    """Valor monetário como número JSON (e não string)."""

    def __init__(self, **kwargs):
        super().__init__(max_digits=12, decimal_places=2, coerce_to_string=False, **kwargs)


class LancamentoEntradaSerializer(serializers.Serializer):
    """Payload de criação de um lançamento manual."""

    tipo = serializers.ChoiceField(choices=TipoLancamento.choices)
    descricao = serializers.CharField(max_length=255)
    canal = serializers.ChoiceField(choices=Canal.choices, required=False, allow_blank=True, default="")
    valor = ValorField(min_value=0)
    data = serializers.DateTimeField(required=False)


class LancamentoSaidaSerializer(serializers.ModelSerializer):
    valor = ValorField()
    canal_nome = serializers.SerializerMethodField()

    class Meta:
        model = Lancamento
        fields = [
            "id",
            "tipo",
            "descricao",
            "canal",
            "canal_nome",
            "valor",
            "data",
            "criado_em",
            "atualizado_em",
        ]

    def get_canal_nome(self, obj):
        return obj.get_canal_display() if obj.canal else None


class ResumoFinanceiroSaidaSerializer(serializers.Serializer):
    """Indicadores financeiros da tela de financeiro."""

    receitas = ValorField()
    despesas = ValorField()
    taxas = ValorField()
    margem_liquida = serializers.DecimalField(
        max_digits=6, decimal_places=2, coerce_to_string=False
    )
