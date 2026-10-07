import pytest
from rest_framework.test import APIClient

from apps.contas.tests.factories import SENHA_PADRAO, UsuarioFactory
from apps.fornecedores.models import Fornecedor
from apps.produtos.models import Produto


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


@pytest.mark.django_db
class TestRotasDeFornecedores:
    def test_lista_fornecedores_com_produtos_vinculados(self, client):
        usuario = UsuarioFactory()
        fornecedor = Fornecedor.objects_todos.create(
            vendedor=usuario.vendedor, nome="Tech Import", email="contato@techimport.com"
        )
        Produto.objects_todos.create(
            vendedor=usuario.vendedor, nome="Fone", sku="FON-1", fornecedor=fornecedor
        )

        resposta = client.get("/api/v1/fornecedores", **_autenticar(client, usuario))

        assert resposta.status_code == 200
        assert resposta.data["count"] == 1
        assert resposta.data["results"][0]["nome"] == "Tech Import"
        assert resposta.data["results"][0]["produtos_vinculados"] == 1

    def test_fornecedores_de_outro_vendedor_nao_aparecem(self, client):
        dono = UsuarioFactory()
        estranho = UsuarioFactory()
        Fornecedor.objects_todos.create(vendedor=dono.vendedor, nome="Tech Import")
        cabecalhos = _autenticar(client, estranho)

        resposta = client.get("/api/v1/fornecedores", **cabecalhos)

        assert resposta.data["count"] == 0

    def test_cria_fornecedor(self, client):
        usuario = UsuarioFactory()

        resposta = client.post(
            "/api/v1/fornecedores",
            {"nome": "Confecções Real", "email": "vendas@real.com.br"},
            format="json",
            **_autenticar(client, usuario),
        )

        assert resposta.status_code == 201
        assert resposta.data["nome"] == "Confecções Real"
        assert resposta.data["produtos_vinculados"] == 0
        assert Fornecedor.objects_todos.filter(vendedor=usuario.vendedor).count() == 1

    def test_email_duplicado_retorna_409(self, client):
        usuario = UsuarioFactory()
        Fornecedor.objects_todos.create(
            vendedor=usuario.vendedor, nome="Primeiro", email="vendas@real.com.br"
        )

        resposta = client.post(
            "/api/v1/fornecedores",
            {"nome": "Segundo", "email": "VENDAS@REAL.COM.BR"},
            format="json",
            **_autenticar(client, usuario),
        )

        assert resposta.status_code == 409
        assert resposta.data["codigo"] == "fornecedor_email_duplicado"

    def test_mesmo_email_em_vendedores_diferentes_e_permitido(self, client):
        primeiro = UsuarioFactory()
        segundo = UsuarioFactory()
        Fornecedor.objects_todos.create(
            vendedor=primeiro.vendedor, nome="Primeiro", email="vendas@real.com.br"
        )

        resposta = client.post(
            "/api/v1/fornecedores",
            {"nome": "Segundo", "email": "vendas@real.com.br"},
            format="json",
            **_autenticar(client, segundo),
        )

        assert resposta.status_code == 201

    def test_detalhe_e_atualizacao(self, client):
        usuario = UsuarioFactory()
        fornecedor = Fornecedor.objects_todos.create(
            vendedor=usuario.vendedor, nome="Tech Import"
        )

        resposta = client.patch(
            f"/api/v1/fornecedores/{fornecedor.id}",
            {"nome": "Tech Import LTDA"},
            format="json",
            **_autenticar(client, usuario),
        )

        assert resposta.status_code == 200
        assert resposta.data["nome"] == "Tech Import LTDA"

    def test_detalhe_de_fornecedor_de_outro_vendedor_e_404(self, client):
        dono = UsuarioFactory()
        estranho = UsuarioFactory()
        fornecedor = Fornecedor.objects_todos.create(vendedor=dono.vendedor, nome="Tech Import")

        resposta = client.get(
            f"/api/v1/fornecedores/{fornecedor.id}", **_autenticar(client, estranho)
        )

        assert resposta.status_code == 404

    def test_rotas_exigem_autenticacao(self, client):
        assert client.get("/api/v1/fornecedores").status_code == 401
        assert client.post("/api/v1/fornecedores", {}, format="json").status_code == 401
