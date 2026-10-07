from django.urls import path

from apps.produtos.views import (
    EstoqueResumoView,
    ProdutoDetalheView,
    ProdutoListCreateView,
)

urlpatterns = [
    path("produtos", ProdutoListCreateView.as_view(), name="produtos-lista-criar"),
    path("produtos/<uuid:id>", ProdutoDetalheView.as_view(), name="produtos-detalhe"),
    path("estoque/resumo", EstoqueResumoView.as_view(), name="estoque-resumo"),
]
