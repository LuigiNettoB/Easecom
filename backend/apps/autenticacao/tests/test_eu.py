import pytest

from apps.contas.tests.factories import SENHA_PADRAO, UsuarioFactory


@pytest.mark.django_db
class TestEu:
    def test_acesso_com_token_retorna_dados_do_usuario_autenticado(self, client):
        UsuarioFactory(email="eu@teste.com")
        login = client.post(
            "/api/v1/auth/login",
            {"email": "eu@teste.com", "password": SENHA_PADRAO},
            format="json",
        )
        access = login.data["access"]

        resposta = client.get("/api/v1/eu", HTTP_AUTHORIZATION=f"Bearer {access}")

        assert resposta.status_code == 200
        assert resposta.data["email"] == "eu@teste.com"

    def test_acesso_sem_token_retorna_401_tratado(self, client):
        resposta = client.get("/api/v1/eu")

        assert resposta.status_code == 401
        assert resposta.data["codigo"] == "not_authenticated"
