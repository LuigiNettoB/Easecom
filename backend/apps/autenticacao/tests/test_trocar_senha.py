import pytest

from apps.contas.models import Usuario
from apps.contas.tests.factories import SENHA_PADRAO, UsuarioFactory


@pytest.mark.django_db
class TestTrocarSenha:
    def _obter_access_token(self, client, email):
        login = client.post(
            "/api/v1/auth/login",
            {"email": email, "password": SENHA_PADRAO},
            format="json",
        )
        return login.data["access"]

    def test_troca_com_senha_atual_correta(self, client):
        usuario = UsuarioFactory(email="troca@teste.com")
        access = self._obter_access_token(client, "troca@teste.com")

        resposta = client.post(
            "/api/v1/eu/senha",
            {"senha_atual": SENHA_PADRAO, "senha_nova": "NovaSenhaForte123!"},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {access}",
        )

        assert resposta.status_code == 204
        usuario.refresh_from_db()
        assert usuario.check_password("NovaSenhaForte123!")

    def test_troca_com_senha_atual_incorreta_retorna_erro_tratado(self, client):
        UsuarioFactory(email="troca2@teste.com")
        access = self._obter_access_token(client, "troca2@teste.com")

        resposta = client.post(
            "/api/v1/eu/senha",
            {"senha_atual": "senha-errada", "senha_nova": "NovaSenhaForte123!"},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {access}",
        )

        assert resposta.status_code == 400
        assert resposta.data["codigo"] == "senha_atual_incorreta"

        usuario = Usuario.objects.get(email="troca2@teste.com")
        assert usuario.check_password(SENHA_PADRAO)

    def test_troca_sem_token_retorna_401(self, client):
        resposta = client.post(
            "/api/v1/eu/senha",
            {"senha_atual": "qualquer", "senha_nova": "NovaSenhaForte123!"},
            format="json",
        )

        assert resposta.status_code == 401
