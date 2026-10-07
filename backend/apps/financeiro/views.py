from drf_spectacular.utils import extend_schema
from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.exceptions import ErroDeNegocio
from apps.financeiro.filters import LancamentoFiltro
from apps.financeiro.models import Lancamento
from apps.financeiro.serializers import (
    LancamentoEntradaSerializer,
    LancamentoSaidaSerializer,
    ResumoFinanceiroSaidaSerializer,
)
from apps.financeiro.services import criar_lancamento, obter_resumo_financeiro


def _vendedor_da_requisicao(request):
    if request.user.vendedor_id is None:
        raise ErroDeNegocio(
            mensagem="Usuário sem vendedor associado não tem dados financeiros.",
            codigo="vendedor_ausente",
            status_code=400,
        )
    return request.user.vendedor


@extend_schema(tags=["financeiro"])
class ResumoFinanceiroView(APIView):
    """Indicadores financeiros do vendedor.

    Filtros opcionais de período: `realizado_de` e `realizado_ate`
    (ISO datetime) aplicados aos pedidos pagos e lançamentos manuais.
    """

    @extend_schema(responses={200: ResumoFinanceiroSaidaSerializer})
    def get(self, request):
        resumo = obter_resumo_financeiro(
            vendedor=_vendedor_da_requisicao(request),
            realizado_de=request.query_params.get("realizado_de"),
            realizado_ate=request.query_params.get("realizado_ate"),
        )
        return Response(ResumoFinanceiroSaidaSerializer(resumo).data)


@extend_schema(tags=["financeiro"])
class LancamentoListCreateView(generics.ListCreateAPIView):
    """Lista ou cria os lançamentos manuais do vendedor.

    Filtros de leitura: `tipo`, `canal`, `realizado_de` e `realizado_ate`.
    """

    filterset_class = LancamentoFiltro
    serializer_class = LancamentoSaidaSerializer

    def get_queryset(self):
        return Lancamento.objects.all()

    @extend_schema(
        request=LancamentoEntradaSerializer, responses={201: LancamentoSaidaSerializer}
    )
    def post(self, request, *args, **kwargs):
        entrada = LancamentoEntradaSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        lancamento = criar_lancamento(
            vendedor=_vendedor_da_requisicao(request), dados=entrada.validated_data
        )
        return Response(LancamentoSaidaSerializer(lancamento).data, status=201)
