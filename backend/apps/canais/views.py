from drf_spectacular.utils import extend_schema
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.canais.services import obter_resumo_mercado_livre


@extend_schema(tags=["canais"])
class MercadoLivreResumoView(APIView):
    """Resumo simulado de um canal (Mercado Livre) a partir de um fixture estático.

    Endpoint temporário para testar a exibição de dados de canal no
    dashboard do front — não lê nem grava nada no banco, não representa um
    módulo de negócio real.
    """

    @extend_schema(responses={200: dict})
    def get(self, request):
        return Response(obter_resumo_mercado_livre())
