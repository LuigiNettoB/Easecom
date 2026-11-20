from drf_spectacular.utils import extend_schema
from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.assistente.models import Conversa
from apps.assistente.serializers import (
    ConversaDetalheSerializer,
    ConversaResumoSerializer,
    LimiteDiarioSerializer,
    MensagemEntradaSerializer,
    RespostaDoAssistenteSerializer,
)
from apps.assistente.services import (
    enviar_mensagem,
    excluir_conversa,
    obter_conversa,
    obter_limite_diario,
)
from apps.core.exceptions import ErroDeNegocio


def _vendedor_da_requisicao(request):
    if request.user.vendedor_id is None:
        raise ErroDeNegocio(
            mensagem="Usuário sem vendedor associado não pode usar o assistente.",
            codigo="vendedor_ausente",
            status_code=400,
        )
    return request.user.vendedor


@extend_schema(tags=["assistente"])
class MensagemView(APIView):
    """Envia uma pergunta ao assistente e devolve a resposta.

    Sem `conversa_id`, começa uma conversa nova. A resposta pode levar alguns
    segundos: o assistente consulta os dados da loja antes de responder.
    """

    @extend_schema(
        request=MensagemEntradaSerializer, responses={201: RespostaDoAssistenteSerializer}
    )
    def post(self, request):
        entrada = MensagemEntradaSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        vendedor = _vendedor_da_requisicao(request)
        conversa, mensagem = enviar_mensagem(
            usuario=request.user,
            vendedor=vendedor,
            texto=entrada.validated_data["mensagem"],
            conversa_id=entrada.validated_data.get("conversa_id"),
        )
        saida = RespostaDoAssistenteSerializer(
            {
                "conversa": conversa,
                "mensagem": mensagem,
                "limite_diario": obter_limite_diario(vendedor=vendedor),
            }
        )
        return Response(saida.data, status=201)


@extend_schema(tags=["assistente"])
class ConversaListaView(generics.ListAPIView):
    """Conversas do usuário com o assistente, da mais recente para a mais antiga."""

    serializer_class = ConversaResumoSerializer

    def get_queryset(self):
        return Conversa.objects_todos.filter(
            usuario=self.request.user, vendedor_id=self.request.user.vendedor_id
        )


@extend_schema(tags=["assistente"])
class ConversaDetalheView(APIView):
    """Mensagens de uma conversa, ou exclusão dela."""

    @extend_schema(responses={200: ConversaDetalheSerializer})
    def get(self, request, id):
        conversa = obter_conversa(usuario=request.user, conversa_id=id)
        return Response(ConversaDetalheSerializer(conversa).data)

    @extend_schema(responses={204: None})
    def delete(self, request, id):
        excluir_conversa(conversa=obter_conversa(usuario=request.user, conversa_id=id))
        return Response(status=204)


@extend_schema(tags=["assistente"])
class LimiteDiarioView(APIView):
    """Quantas perguntas a loja ainda pode fazer hoje."""

    @extend_schema(responses={200: LimiteDiarioSerializer})
    def get(self, request):
        limite = obter_limite_diario(vendedor=_vendedor_da_requisicao(request))
        return Response(LimiteDiarioSerializer(limite).data)
