from django_filters import rest_framework as filters

from apps.pedidos.models import Canal, Pedido, StatusPedido


class PedidoFiltro(filters.FilterSet):
    canal = filters.ChoiceFilter(choices=Canal.choices)
    status = filters.ChoiceFilter(choices=StatusPedido.choices)
    realizado_de = filters.IsoDateTimeFilter(field_name="realizado_em", lookup_expr="gte")
    realizado_ate = filters.IsoDateTimeFilter(field_name="realizado_em", lookup_expr="lte")

    class Meta:
        model = Pedido
        fields = ["canal", "status", "entregue"]
