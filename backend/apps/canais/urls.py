from django.urls import path

from apps.canais.views import MercadoLivreResumoView

urlpatterns = [
    path("canais/mercado-livre/resumo", MercadoLivreResumoView.as_view(), name="canais-ml-resumo"),
]
