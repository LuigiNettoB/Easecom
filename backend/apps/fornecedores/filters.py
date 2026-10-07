from django.db.models import Q
from django_filters import rest_framework as filters

from apps.fornecedores.models import Fornecedor


class FornecedorFiltro(filters.FilterSet):
    """Filtros da listagem de fornecedores."""

    busca = filters.CharFilter(method="filtrar_busca")
    ativo = filters.BooleanFilter()

    class Meta:
        model = Fornecedor
        fields = ["ativo"]

    def filtrar_busca(self, queryset, name, value):
        termo = value.strip()
        if not termo:
            return queryset
        return queryset.filter(Q(nome__icontains=termo) | Q(email__icontains=termo))
