from django.urls import path

from apps.assistente.views import (
    ConversaDetalheView,
    ConversaListaView,
    LimiteDiarioView,
    MensagemView,
)

urlpatterns = [
    path("assistente/mensagens", MensagemView.as_view(), name="assistente-mensagens"),
    path("assistente/conversas", ConversaListaView.as_view(), name="assistente-conversas"),
    path(
        "assistente/conversas/<uuid:id>",
        ConversaDetalheView.as_view(),
        name="assistente-conversa-detalhe",
    ),
    path("assistente/limite", LimiteDiarioView.as_view(), name="assistente-limite"),
]
