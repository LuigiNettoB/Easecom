from drf_spectacular.utils import extend_schema
from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.exceptions import ErroDeNegocio, RecursoNaoEncontrado
from apps.fornecedores.filters import FornecedorFiltro
from apps.fornecedores.models import Fornecedor
from apps.fornecedores.serializers import (
    FornecedorEntradaSerializer,
    FornecedorSaidaSerializer,
)
from apps.fornecedores.services import (
    atualizar_fornecedor,
    criar_fornecedor,
    excluir_fornecedor,
)


def _vendedor_da_requisicao(request):
    if request.user.vendedor_id is None:
        raise ErroDeNegocio(
            mensagem="Usuário sem vendedor associado não tem fornecedores.",
            codigo="vendedor_ausente",
            status_code=400,
        )
    return request.user.vendedor


def _obter_fornecedor(request, id):
    try:
        return Fornecedor.objects.get(id=id)
    except Fornecedor.DoesNotExist as exc:
        raise RecursoNaoEncontrado(mensagem="Fornecedor não encontrado.") from exc


@extend_schema(tags=["fornecedores"])
class FornecedorListCreateView(generics.ListCreateAPIView):
    """Lista ou cria os fornecedores do vendedor.

    Filtros de leitura: `busca` (nome/e-mail) e `ativo`. A listagem é
    paginada e cada item inclui a contagem `produtos_vinculados`.
    """

    filterset_class = FornecedorFiltro
    serializer_class = FornecedorSaidaSerializer

    def get_queryset(self):
        return Fornecedor.objects.all()

    @extend_schema(request=FornecedorEntradaSerializer, responses={201: FornecedorSaidaSerializer})
    def post(self, request, *args, **kwargs):
        entrada = FornecedorEntradaSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        fornecedor = criar_fornecedor(
            vendedor=_vendedor_da_requisicao(request), **entrada.validated_data
        )
        return Response(FornecedorSaidaSerializer(fornecedor).data, status=201)


@extend_schema(tags=["fornecedores"])
class FornecedorDetalheView(APIView):
    """Detalhe, atualização parcial e exclusão de um fornecedor do vendedor."""

    @extend_schema(responses={200: FornecedorSaidaSerializer})
    def get(self, request, id):
        return Response(FornecedorSaidaSerializer(_obter_fornecedor(request, id)).data)

    @extend_schema(
        request=FornecedorEntradaSerializer, responses={200: FornecedorSaidaSerializer}
    )
    def patch(self, request, id):
        entrada = FornecedorEntradaSerializer(data=request.data, partial=True)
        entrada.is_valid(raise_exception=True)
        fornecedor = atualizar_fornecedor(
            fornecedor=_obter_fornecedor(request, id), **entrada.validated_data
        )
        return Response(FornecedorSaidaSerializer(fornecedor).data)

    @extend_schema(responses={204: None})
    def delete(self, request, id):
        excluir_fornecedor(fornecedor=_obter_fornecedor(request, id))
        return Response(status=204)
