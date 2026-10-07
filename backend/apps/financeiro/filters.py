from django_filters import rest_framework as filters

from apps.financeiro.models import Lancamento, TipoLancamento
from apps.pedidos.models import Canal


class LancamentoFiltro(filters.FilterSet):
    """Filtros da listagem de lançamentos do financeiro."""

    tipo = filters.ChoiceFilter(choices=TipoLancamento.choices)
    canal = filters.ChoiceFilter(choices=Canal.choices)
    realizado_de = filters.IsoDateTimeFilter(field_name="data", lookup_expr="gte")
    realizado_ate = filters.IsoDateTimeFilter(field_name="data", lookup_expr="lte")

    class Meta:
        model = Lancamento
        fields = ["tipo", "canal"]
