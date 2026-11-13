from django.urls import path

from apps.canais.views import (
    MercadoLivreAnuncioDetalheView,
    MercadoLivreAnunciosView,
    MercadoLivreCallbackView,
    MercadoLivreConectarView,
    MercadoLivrePedidosView,
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
    path(
        "canais/mercado-livre/anuncios",
        MercadoLivreAnunciosView.as_view(),
        name="canais-ml-anuncios",
    ),
    path(
        "canais/mercado-livre/anuncios/<str:anuncio_id>",
        MercadoLivreAnuncioDetalheView.as_view(),
        name="canais-ml-anuncio-detalhe",
    ),
    path(
        "canais/mercado-livre/pedidos",
        MercadoLivrePedidosView.as_view(),
        name="canais-ml-pedidos",
    ),
]
