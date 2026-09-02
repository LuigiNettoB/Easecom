from django.conf import settings
from django.shortcuts import redirect
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.canais.services import (
    esta_conectado_ao_mercado_livre,
    gerar_url_autorizacao,
    processar_callback_oauth,
)
from apps.core.exceptions import ErroDeNegocio


@extend_schema(tags=["canais"])
class MercadoLivreConectarView(APIView):
    """Retorna a URL de autorização do Mercado Livre para o vendedor atual."""

    @extend_schema(responses={200: dict})
    def get(self, request):
        if request.user.vendedor_id is None:
            raise ErroDeNegocio(
                mensagem="Usuário sem vendedor associado não pode conectar um canal.",
                codigo="vendedor_ausente",
                status_code=400,
            )
        url = gerar_url_autorizacao(vendedor=request.user.vendedor)
        return Response({"url": url})


@extend_schema(tags=["canais"])
class MercadoLivreStatusView(APIView):
    """Diz se o vendedor atual já conectou uma conta do Mercado Livre."""

    @extend_schema(responses={200: dict})
    def get(self, request):
        if request.user.vendedor_id is None:
            return Response({"conectado": False})
        conectado = esta_conectado_ao_mercado_livre(vendedor=request.user.vendedor)
        return Response({"conectado": conectado})


@extend_schema(tags=["canais"])
class MercadoLivreCallbackView(APIView):
    """Recebe o redirect do Mercado Livre após o usuário autorizar o app.

    Chamada pelo navegador do usuário diretamente pelo domínio do Mercado
    Livre — não carrega nosso JWT, por isso não exige autenticação aqui (a
    identidade do vendedor vem do `state`, ver `services.gerar_url_autorizacao`).
    """

    permission_classes = [AllowAny]

    def get(self, request):
        code = request.query_params.get("code")
        state = request.query_params.get("state")

        if request.query_params.get("error") or not code or not state:
            return redirect(f"{settings.FRONTEND_URL}/canais?mercado_livre=erro")

        try:
            processar_callback_oauth(code=code, state=state)
        except ErroDeNegocio:
            return redirect(f"{settings.FRONTEND_URL}/canais?mercado_livre=erro")

        return redirect(f"{settings.FRONTEND_URL}/canais?mercado_livre=conectado")
