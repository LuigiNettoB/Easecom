from django.urls import path

from apps.pedidos.views import (
    PedidoDetalheView,
    PedidoListaView,
    PedidoSincronizarView,
    VendasResumoView,
)

urlpatterns = [
    path("pedidos", PedidoListaView.as_view(), name="pedidos-lista"),
    path("pedidos/sincronizar", PedidoSincronizarView.as_view(), name="pedidos-sincronizar"),
    path("pedidos/<uuid:id>", PedidoDetalheView.as_view(), name="pedidos-detalhe"),
    path("vendas/resumo", VendasResumoView.as_view(), name="vendas-resumo"),
]
