from drf_spectacular.utils import extend_schema
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.exceptions import ErroDeNegocio, RecursoNaoEncontrado
from apps.pedidos.filters import PedidoFiltro
from apps.pedidos.models import Pedido
from apps.pedidos.serializers import (
    PedidoSaidaSerializer,
    ResumoVendasSaidaSerializer,
    SincronizacaoSaidaSerializer,
)
from apps.pedidos.services import obter_resumo_vendas, sincronizar_pedidos


def _vendedor_da_requisicao(request):
    if request.user.vendedor_id is None:
        raise ErroDeNegocio(
            mensagem="Usuário sem vendedor associado não tem pedidos.",
            codigo="vendedor_ausente",
            status_code=400,
        )
    return request.user.vendedor


@extend_schema(tags=["pedidos"])
class PedidoListaView(ListAPIView):
    """Lista os pedidos do vendedor, de todos os canais, do mais recente ao mais antigo."""

    serializer_class = PedidoSaidaSerializer
    filterset_class = PedidoFiltro

    def get_queryset(self):
        # Avaliado a cada requisição: o `TenantManager` filtra pelo vendedor do
        # contexto atual, então o queryset não pode ser um atributo de classe.
        return Pedido.objects.prefetch_related("itens")


@extend_schema(tags=["pedidos"])
class PedidoDetalheView(APIView):
    """Retorna um pedido do vendedor com seus itens."""

    @extend_schema(responses={200: PedidoSaidaSerializer})
    def get(self, request, id):
        try:
            pedido = Pedido.objects.prefetch_related("itens").get(id=id)
        except Pedido.DoesNotExist as exc:
            raise RecursoNaoEncontrado(mensagem="Pedido não encontrado.") from exc
        return Response(PedidoSaidaSerializer(pedido).data)


@extend_schema(tags=["pedidos"])
class PedidoSincronizarView(APIView):
    """Busca os pedidos nos canais conectados e atualiza a cópia do hub."""

    @extend_schema(request=None, responses={200: SincronizacaoSaidaSerializer})
    def post(self, request):
        canais = sincronizar_pedidos(vendedor=_vendedor_da_requisicao(request))
        return Response(SincronizacaoSaidaSerializer({"canais": canais}).data)


@extend_schema(tags=["pedidos"])
class VendasResumoView(APIView):
    """Totais de venda do vendedor somando todos os canais."""

    @extend_schema(responses={200: ResumoVendasSaidaSerializer})
    def get(self, request):
        resumo = obter_resumo_vendas(vendedor=_vendedor_da_requisicao(request))
        return Response(ResumoVendasSaidaSerializer(resumo).data)
