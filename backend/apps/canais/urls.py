from django.urls import path

from apps.canais.views import (
    MercadoLivreCallbackView,
    MercadoLivreConectarView,
    MercadoLivreResumoView,
    MercadoLivreStatusView,
)

urlpatterns = [
    path("canais/mercado-livre/resumo", MercadoLivreResumoView.as_view(), name="canais-ml-resumo"),
    path(
        "canais/mercado-livre/conectar",
        MercadoLivreConectarView.as_view(),
        name="canais-ml-conectar",
    ),
    path(
        "canais/mercado-livre/callback",
        MercadoLivreCallbackView.as_view(),
        name="canais-ml-callback",
    ),
    path(
        "canais/mercado-livre/status",
        MercadoLivreStatusView.as_view(),
        name="canais-ml-status",
    ),
]
