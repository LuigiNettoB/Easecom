from django.urls import path

from apps.fornecedores.views import FornecedorDetalheView, FornecedorListCreateView

urlpatterns = [
    path("fornecedores", FornecedorListCreateView.as_view(), name="fornecedores-lista-criar"),
    path("fornecedores/<uuid:id>", FornecedorDetalheView.as_view(), name="fornecedores-detalhe"),
]
