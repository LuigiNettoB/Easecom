from django.urls import path

from apps.canais.views import (
    MercadoLivreCallbackView,
    MercadoLivreConectarView,
    MercadoLivreStatusView,
)

urlpatterns = [
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
