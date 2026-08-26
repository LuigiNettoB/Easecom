from drf_spectacular.utils import extend_schema
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.arquivos.models import Arquivo
from apps.arquivos.serializers import ArquivoEntradaSerializer, ArquivoSaidaSerializer
from apps.arquivos.services import enviar_arquivo, obter_url_arquivo
from apps.core.exceptions import RecursoNaoEncontrado


@extend_schema(tags=["arquivos"])
class ArquivoUploadView(APIView):
    """Envia um arquivo para o Supabase Storage."""

    parser_classes = [MultiPartParser]

    @extend_schema(request=ArquivoEntradaSerializer, responses={201: ArquivoSaidaSerializer})
    def post(self, request):
        entrada = ArquivoEntradaSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)

        arquivo = enviar_arquivo(
            vendedor=request.user.vendedor,
            arquivo_upload=entrada.validated_data["arquivo"],
        )
        url = obter_url_arquivo(arquivo=arquivo)

        saida = ArquivoSaidaSerializer(arquivo, context={"url": url})
        return Response(saida.data, status=201)


@extend_schema(tags=["arquivos"])
class ArquivoDetalheView(APIView):
    """Retorna a URL para baixar um arquivo enviado anteriormente."""

    @extend_schema(responses={200: ArquivoSaidaSerializer})
    def get(self, request, id):
        try:
            arquivo = Arquivo.objects.get(id=id)
        except Arquivo.DoesNotExist as exc:
            raise RecursoNaoEncontrado(mensagem="Arquivo não encontrado.") from exc

        url = obter_url_arquivo(arquivo=arquivo)
        saida = ArquivoSaidaSerializer(arquivo, context={"url": url})
        return Response(saida.data)
