from drf_spectacular.utils import extend_schema
from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.exceptions import ErroDeNegocio, RecursoNaoEncontrado
from apps.produtos.filters import ProdutoFiltro
from apps.produtos.models import Produto
from apps.produtos.serializers import (
    EstoqueResumoSaidaSerializer,
    ProdutoEntradaSerializer,
    ProdutoSaidaSerializer,
)
from apps.produtos.services import (
    atualizar_produto,
    criar_produto,
    excluir_produto,
    obter_resumo_estoque,
)


def _vendedor_da_requisicao(request):
    if request.user.vendedor_id is None:
        raise ErroDeNegocio(
            mensagem="Usuário sem vendedor associado não tem produtos.",
            codigo="vendedor_ausente",
            status_code=400,
        )
    return request.user.vendedor


def _obter_produto(request, id):
    try:
        return (
            Produto.objects.select_related("fornecedor")
            .prefetch_related("canais_relacionados")
            .get(id=id)
        )
    except Produto.DoesNotExist as exc:
        raise RecursoNaoEncontrado(mensagem="Produto não encontrado.") from exc


@extend_schema(tags=["produtos"])
class ProdutoListCreateView(generics.ListCreateAPIView):
    """Lista ou cria os produtos do vendedor.

    Filtros de leitura: `busca`, `categoria`, `canal` e `estoque_baixo` (a
    listagem é paginada). O `POST` aceita `canais` como lista de códigos —
    ex.: `["MERCADO_LIVRE", "SHOPEE"]`.
    """

    filterset_class = ProdutoFiltro
    serializer_class = ProdutoSaidaSerializer

    def get_queryset(self):
        return (
            Produto.objects.select_related("fornecedor")
            .prefetch_related("canais_relacionados")
            .distinct()
        )

    @extend_schema(request=ProdutoEntradaSerializer, responses={201: ProdutoSaidaSerializer})
    def post(self, request, *args, **kwargs):
        entrada = ProdutoEntradaSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        produto = criar_produto(
            vendedor=_vendedor_da_requisicao(request), dados=entrada.validated_data
        )
        return Response(ProdutoSaidaSerializer(produto).data, status=201)


@extend_schema(tags=["produtos"])
class ProdutoDetalheView(APIView):
    """Detalhe, atualização parcial e exclusão de um produto do vendedor."""

    @extend_schema(responses={200: ProdutoSaidaSerializer})
    def get(self, request, id):
        return Response(ProdutoSaidaSerializer(_obter_produto(request, id)).data)

    @extend_schema(request=ProdutoEntradaSerializer, responses={200: ProdutoSaidaSerializer})
    def patch(self, request, id):
        entrada = ProdutoEntradaSerializer(data=request.data, partial=True)
        entrada.is_valid(raise_exception=True)
        produto = atualizar_produto(produto=_obter_produto(request, id), dados=entrada.validated_data)
        return Response(ProdutoSaidaSerializer(produto).data)

    @extend_schema(responses={204: None})
    def delete(self, request, id):
        excluir_produto(produto=_obter_produto(request, id))
        return Response(status=204)


@extend_schema(tags=["produtos"])
class EstoqueResumoView(APIView):
    """Indicadores de estoque do vendedor (para a futura tela de Estoque)."""

    @extend_schema(responses={200: EstoqueResumoSaidaSerializer})
    def get(self, request):
        resumo = obter_resumo_estoque(vendedor=_vendedor_da_requisicao(request))
        return Response(EstoqueResumoSaidaSerializer(resumo).data)
