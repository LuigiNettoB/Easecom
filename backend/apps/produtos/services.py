from decimal import Decimal

from django.db import transaction
from django.db.models import Count, F, Sum

from apps.core.exceptions import ErroDeNegocio
from apps.fornecedores.models import Fornecedor
from apps.produtos.models import Produto, ProdutoCanal

# mesmo limite usado pela tela de catálogo para marcar "estoque baixo"
LIMITE_ESTOQUE_BAIXO = 10


@transaction.atomic
def criar_produto(*, vendedor, dados) -> Produto:
    """Cria um produto e os canais onde ele é anunciado, em uma transação."""
    sku = dados.get("sku", "").strip()
    _validar_sku(vendedor=vendedor, sku=sku)

    produto = Produto.objects_todos.create(
        vendedor=vendedor,
        nome=dados["nome"].strip(),
        sku=sku,
        categoria=dados.get("categoria", "").strip(),
        preco=dados.get("preco", Decimal("0")),
        estoque=dados.get("estoque", 0),
        foto_url=dados.get("foto_url", "").strip(),
        fornecedor=_resolver_fornecedor(
            vendedor=vendedor, fornecedor_id=dados.get("fornecedor_id")
        ),
    )
    _definir_canais(produto=produto, canais=dados.get("canais", []))
    return produto


def atualizar_produto(*, produto, dados) -> Produto:
    """Atualiza apenas os campos enviados (semântica de PATCH)."""
    if "sku" in dados:
        _validar_sku(vendedor=produto.vendedor, sku=dados.get("sku", "").strip())

    with transaction.atomic():
        if "nome" in dados and dados["nome"] is not None:
            produto.nome = dados["nome"].strip()
        if "sku" in dados:
            produto.sku = dados["sku"].strip()
        if "categoria" in dados and dados["categoria"] is not None:
            produto.categoria = dados["categoria"].strip()
        if "preco" in dados:
            produto.preco = dados["preco"]
        if "estoque" in dados:
            produto.estoque = dados["estoque"]
        if "foto_url" in dados and dados["foto_url"] is not None:
            produto.foto_url = dados["foto_url"].strip()
        if "fornecedor_id" in dados:
            produto.fornecedor = _resolver_fornecedor(
                vendedor=produto.vendedor, fornecedor_id=dados["fornecedor_id"]
            )
        produto.save()

        if "canais" in dados:
            _definir_canais(produto=produto, canais=dados["canais"])
    return produto


def excluir_produto(*, produto) -> None:
    """Remove um produto (e seus canais, via cascade)."""
    produto.delete()


def obter_resumo_estoque(*, vendedor) -> dict:
    """Indicadores de estoque do vendedor para a futura tela de estoque."""
    produtos = Produto.objects_todos.filter(vendedor=vendedor)
    agregados = produtos.aggregate(
        total_produtos=Count("id"),
        unidades_totais=Sum("estoque"),
        valor_estoque=Sum(F("preco") * F("estoque")),
    )
    return {
        "total_produtos": agregados["total_produtos"] or 0,
        "unidades_totais": agregados["unidades_totais"] or 0,
        "produtos_estoque_baixo": produtos.filter(estoque__lte=LIMITE_ESTOQUE_BAIXO).count(),
        "valor_estoque": agregados["valor_estoque"] or Decimal("0"),
    }


def _definir_canais(*, produto, canais):
    produto.canais_relacionados.all().delete()
    ProdutoCanal.objects.bulk_create(
        ProdutoCanal(produto=produto, canal=canal) for canal in canais
    )


def _resolver_fornecedor(*, vendedor, fornecedor_id):
    """Resolve o fornecedor somente dentro do vendedor atual."""
    if not fornecedor_id:
        return None
    try:
        # o manager padrão já filtra pelo vendedor da requisição
        return Fornecedor.objects.get(id=fornecedor_id)
    except Fornecedor.DoesNotExist as exc:
        raise ErroDeNegocio(
            mensagem="O fornecedor informado não existe.",
            codigo="fornecedor_inexistente",
            status_code=400,
            erros_de_campo=[
                {"campo": "fornecedor_id", "mensagens": ["Fornecedor não encontrado."]}
            ],
        ) from exc


def _validar_sku(*, vendedor, sku):
    if sku and Produto.objects_todos.filter(vendedor=vendedor, sku__iexact=sku).exists():
        raise _erro_sku_duplicado()


def _erro_sku_duplicado() -> ErroDeNegocio:
    return ErroDeNegocio(
        mensagem="Já existe um produto com este SKU.",
        codigo="sku_duplicado",
        status_code=409,
        erros_de_campo=[{"campo": "sku", "mensagens": ["Já existe um produto com este SKU."]}],
    )
