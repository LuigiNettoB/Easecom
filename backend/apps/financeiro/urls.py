from django.urls import path

from apps.financeiro.views import LancamentoListCreateView, ResumoFinanceiroView

urlpatterns = [
    path("financeiro/resumo", ResumoFinanceiroView.as_view(), name="financeiro-resumo"),
    path(
        "financeiro/lancamentos",
        LancamentoListCreateView.as_view(),
        name="financeiro-lancamentos",
    ),
]
