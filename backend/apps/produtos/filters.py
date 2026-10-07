from django.db.models import Q
from django_filters import rest_framework as filters

from apps.pedidos.models import Canal
from apps.produtos.models import Produto
from apps.produtos.services import LIMITE_ESTOQUE_BAIXO


class ProdutoFiltro(filters.FilterSet):
    """Filtros da listagem de produtos da tela de catálogo."""

    busca = filters.CharFilter(method="filtrar_busca")
    categoria = filters.CharFilter(field_name="categoria", lookup_expr="icontains")
    canal = filters.ChoiceFilter(
        field_name="canais_relacionados__canal", choices=Canal.choices
    )
    estoque_baixo = filters.BooleanFilter(method="filtrar_estoque_baixo")

    class Meta:
        model = Produto
        fields = ["categoria", "canal"]

    def filtrar_busca(self, queryset, name, value):
        termo = value.strip()
        if not termo:
            return queryset
        return queryset.filter(
            Q(nome__icontains=termo) | Q(sku__icontains=termo) | Q(categoria__icontains=termo)
        )

    def filtrar_estoque_baixo(self, queryset, name, value):
        # o front marca como "Baixo" produtos com estoque <= LIMITE_ESTOQUE_BAIXO
        if value:
            return queryset.filter(estoque__lte=LIMITE_ESTOQUE_BAIXO)
        return queryset.filter(estoque__gt=LIMITE_ESTOQUE_BAIXO)
