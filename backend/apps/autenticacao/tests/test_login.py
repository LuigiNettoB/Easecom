import pytest

from apps.contas.tests.factories import SENHA_PADRAO, UsuarioFactory


@pytest.mark.django_db
class TestLogin:
    def test_login_valido_retorna_access_e_refresh(self, client):
        UsuarioFactory(email="login@teste.com")

        resposta = client.post(
            "/api/v1/auth/login",
            {"email": "login@teste.com", "password": SENHA_PADRAO},
            format="json",
        )

        assert resposta.status_code == 200
        assert "access" in resposta.data
        assert "refresh" in resposta.data

    def test_login_invalido_retorna_401_tratado(self, client):
        UsuarioFactory(email="login2@teste.com")

        resposta = client.post(
            "/api/v1/auth/login",
            {"email": "login2@teste.com", "password": "senha-errada"},
            format="json",
        )

        assert resposta.status_code == 401
        assert resposta.data["codigo"] == "authentication_failed"
