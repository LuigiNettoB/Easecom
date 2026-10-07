import pytest
from rest_framework.test import APIClient

from apps.contas.tests.factories import SENHA_PADRAO, UsuarioFactory
from apps.produtos.models import Produto, ProdutoCanal


@pytest.fixture
def client():
    return APIClient()


def _autenticar(client, usuario):
    login = client.post(
        "/api/v1/auth/login",
        {"email": usuario.email, "password": SENHA_PADRAO},
        format="json",
    )
    return {"HTTP_AUTHORIZATION": f"Bearer {login.data['access']}"}


def _criar_produto(vendedor, **campos):
    return Produto.objects_todos.create(vendedor=vendedor, nome="Camiseta", sku="CAM-1", **campos)


@pytest.mark.django_db
class TestRotasDeProdutos:
    def test_lista_produtos_do_vendedor(self, client):
        usuario = UsuarioFactory()
        _criar_produto(usuario.vendedor, preco="129.90", estoque=10)

        resposta = client.get("/api/v1/produtos", **_autenticar(client, usuario))

        assert resposta.status_code == 200
        assert resposta.data["count"] == 1
        assert resposta.data["results"][0]["nome"] == "Camiseta"
        assert resposta.data["results"][0]["preco"] == 129.9

    def test_produtos_de_outro_vendedor_nao_aparecem(self, client):
        dono = UsuarioFactory()
        estranho = UsuarioFactory()
        _criar_produto(dono.vendedor)
        cabecalhos = _autenticar(client, estranho)

        lista = client.get("/api/v1/produtos", **cabecalhos)

        assert lista.data["count"] == 0

    def test_cria_produto_com_canais(self, client):
        usuario = UsuarioFactory()

        resposta = client.post(
            "/api/v1/produtos",
            {
                "nome": "Fone Bluetooth",
                "sku": "FON-1",
                "preco": 189,
                "estoque": 10,
                "canais": ["MERCADO_LIVRE", "SHOPEE"],
            },
            format="json",
            **_autenticar(client, usuario),
        )

        assert resposta.status_code == 201
        produto = Produto.objects_todos.get(vendedor=usuario.vendedor)
        canais = set(ProdutoCanal.objects.filter(produto=produto).values_list("canal", flat=True))
        assert canais == {"MERCADO_LIVRE", "SHOPEE"}
        assert resposta.data["canais"] == ["MERCADO_LIVRE", "SHOPEE"]
        assert resposta.data["canais_nome"] == ["Mercado Livre", "Shopee"]

    def test_sku_duplicado_retorna_409(self, client):
        usuario = UsuarioFactory()
        _criar_produto(usuario.vendedor, sku="CAM-1")

        resposta = client.post(
            "/api/v1/produtos",
            {"nome": "Outra", "sku": "cam-1", "preco": 10},
            format="json",
            **_autenticar(client, usuario),
        )

        assert resposta.status_code == 409
        assert resposta.data["codigo"] == "sku_duplicado"

    def test_filtro_de_busca_por_nome_e_sku(self, client):
        usuario = UsuarioFactory()
        _criar_produto(usuario.vendedor, nome="Fone Bluetooth", sku="FON-1")
        _criar_produto(usuario.vendedor, nome="Camiseta", sku="CAM-1")
        cabecalhos = _autenticar(client, usuario)

        por_nome = client.get("/api/v1/produtos", {"busca": "fone"}, **cabecalhos)
        por_sku = client.get("/api/v1/produtos", {"busca": "FON"}, **cabecalhos)

        assert por_nome.data["count"] == 1
        assert por_sku.data["count"] == 1

    def test_filtro_de_estoque_baixo(self, client):
        usuario = UsuarioFactory()
        _criar_produto(usuario.vendedor, nome="Acabando", sku="A-1", estoque=3)
        _criar_produto(usuario.vendedor, nome="Sobrando", sku="S-1", estoque=20)

        resposta = client.get(
            "/api/v1/produtos", {"estoque_baixo": "true"}, **_autenticar(client, usuario)
        )

        assert resposta.data["count"] == 1
        assert resposta.data["results"][0]["nome"] == "Acabando"

    def test_detalhe_de_produto_de_outro_vendedor_e_404(self, client):
        dono = UsuarioFactory()
        estranho = UsuarioFactory()
        produto = _criar_produto(dono.vendedor)

        resposta = client.get(
            f"/api/v1/produtos/{produto.id}", **_autenticar(client, estranho)
        )

        assert resposta.status_code == 404
        assert resposta.data["codigo"] == "recurso_nao_encontrado"

    def test_atualiza_estoque_parcialmente(self, client):
        usuario = UsuarioFactory()
        produto = _criar_produto(usuario.vendedor, estoque=5)

        resposta = client.patch(
            f"/api/v1/produtos/{produto.id}",
            {"estoque": 42},
            format="json",
            **_autenticar(client, usuario),
        )

        assert resposta.status_code == 200
        assert resposta.data["estoque"] == 42

    def test_resumo_de_estoque(self, client):
        usuario = UsuarioFactory()
        _criar_produto(usuario.vendedor, preco="10", estoque=5)
        _criar_produto(usuario.vendedor, preco="20", estoque=3)
        _criar_produto(usuario.vendedor, preco="100", estoque=50)

        resposta = client.get("/api/v1/estoque/resumo", **_autenticar(client, usuario))

        assert resposta.status_code == 200
        assert resposta.data["total_produtos"] == 3
        assert resposta.data["unidades_totais"] == 58
        assert resposta.data["produtos_estoque_baixo"] == 2
        assert resposta.data["valor_estoque"] == 5110

    def test_rotas_exigem_autenticacao(self, client):
        assert client.get("/api/v1/produtos").status_code == 401
        assert client.post("/api/v1/produtos", {}, format="json").status_code == 401
        assert client.get("/api/v1/estoque/resumo").status_code == 401
