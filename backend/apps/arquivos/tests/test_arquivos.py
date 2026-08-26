import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.arquivos.models import Arquivo
from apps.contas.tests.factories import SENHA_PADRAO, UsuarioFactory, VendedorFactory


@pytest.mark.django_db
class TestUploadDeArquivo:
    def _autenticar(self, client, usuario):
        login = client.post(
            "/api/v1/auth/login",
            {"email": usuario.email, "password": SENHA_PADRAO},
            format="json",
        )
        return login.data["access"]

    def test_upload_bem_sucedido_cria_registro_e_retorna_url(self, client):
        usuario = UsuarioFactory(email="upload@teste.com")
        access = self._autenticar(client, usuario)

        arquivo = SimpleUploadedFile("teste.txt", b"conteudo de teste", content_type="text/plain")
        resposta = client.post(
            "/api/v1/arquivos",
            {"arquivo": arquivo},
            format="multipart",
            HTTP_AUTHORIZATION=f"Bearer {access}",
        )

        assert resposta.status_code == 201
        assert resposta.data["url"].startswith("https://")
        assert resposta.data["nome_original"] == "teste.txt"

        registro = Arquivo.objects_todos.get(id=resposta.data["id"])
        assert registro.vendedor_id == usuario.vendedor_id
        assert registro.tamanho_bytes == len(b"conteudo de teste")

    def test_upload_sem_token_retorna_401(self, client):
        arquivo = SimpleUploadedFile("teste.txt", b"x", content_type="text/plain")
        resposta = client.post("/api/v1/arquivos", {"arquivo": arquivo}, format="multipart")

        assert resposta.status_code == 401

    def test_isolamento_arquivo_de_outro_vendedor_retorna_404(self, client):
        usuario_a = UsuarioFactory(email="dono@teste.com")
        usuario_b = UsuarioFactory(email="estranho@teste.com", vendedor=VendedorFactory())

        access_a = self._autenticar(client, usuario_a)
        arquivo = SimpleUploadedFile("privado.txt", b"segredo", content_type="text/plain")
        upload = client.post(
            "/api/v1/arquivos",
            {"arquivo": arquivo},
            format="multipart",
            HTTP_AUTHORIZATION=f"Bearer {access_a}",
        )
        arquivo_id = upload.data["id"]

        access_b = self._autenticar(client, usuario_b)
        resposta = client.get(
            f"/api/v1/arquivos/{arquivo_id}",
            HTTP_AUTHORIZATION=f"Bearer {access_b}",
        )

        assert resposta.status_code == 404
        assert resposta.data["codigo"] == "recurso_nao_encontrado"

    def test_dono_consegue_recuperar_url_do_proprio_arquivo(self, client):
        usuario = UsuarioFactory(email="proprio@teste.com")
        access = self._autenticar(client, usuario)

        arquivo = SimpleUploadedFile("meu.txt", b"meu conteudo", content_type="text/plain")
        upload = client.post(
            "/api/v1/arquivos",
            {"arquivo": arquivo},
            format="multipart",
            HTTP_AUTHORIZATION=f"Bearer {access}",
        )
        arquivo_id = upload.data["id"]

        resposta = client.get(
            f"/api/v1/arquivos/{arquivo_id}",
            HTTP_AUTHORIZATION=f"Bearer {access}",
        )

        assert resposta.status_code == 200
        assert resposta.data["url"].startswith("https://")
