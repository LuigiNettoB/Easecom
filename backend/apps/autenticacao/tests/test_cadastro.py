import pytest

from apps.contas.models import Perfil, Usuario
from apps.contas.tests.factories import UsuarioFactory


@pytest.mark.django_db
class TestCadastro:
    def test_cadastro_bem_sucedido_cria_vendedor_e_administrador(self, client):
        resposta = client.post(
            "/api/v1/auth/cadastro",
            {
                "nome_vendedor": "Loja Teste",
                "nome_usuario": "Ana",
                "email": "ana@teste.com",
                "senha": "SenhaForte123!",
            },
            format="json",
        )

        assert resposta.status_code == 201
        usuario = Usuario.objects.get(email="ana@teste.com")
        assert usuario.perfil == Perfil.ADMINISTRADOR
        assert usuario.vendedor is not None
        assert usuario.check_password("SenhaForte123!")
        assert usuario.password != "SenhaForte123!"

    def test_cadastro_com_email_duplicado_retorna_erro_tratado(self, client):
        UsuarioFactory(email="duplicado@teste.com")

        resposta = client.post(
            "/api/v1/auth/cadastro",
            {
                "nome_vendedor": "Outra Loja",
                "nome_usuario": "Bruno",
                "email": "duplicado@teste.com",
                "senha": "SenhaForte123!",
            },
            format="json",
        )

        assert resposta.status_code == 409
        assert resposta.data["codigo"] == "email_duplicado"
        assert Usuario.objects.filter(email="duplicado@teste.com").count() == 1
