import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.contas.tests.factories import SENHA_PADRAO, UsuarioFactory


@pytest.mark.django_db
class TestFotoDeConta:
    def _autenticar(self, client, usuario):
        login = client.post(
            "/api/v1/auth/login",
            {"email": usuario.email, "password": SENHA_PADRAO},
            format="json",
        )
        return login.data["access"]

    def test_eu_retorna_fotos_nulas_por_padrao(self, client):
        usuario = UsuarioFactory(email="sem-foto@teste.com")
        access = self._autenticar(client, usuario)

        resposta = client.get("/api/v1/eu", HTTP_AUTHORIZATION=f"Bearer {access}")

        assert resposta.status_code == 200
        assert resposta.data["foto_perfil_url"] is None
        assert resposta.data["foto_banner_url"] is None

    def test_envio_de_foto_de_perfil_associa_arquivo_e_retorna_url(self, client):
        usuario = UsuarioFactory(email="foto-perfil@teste.com")
        access = self._autenticar(client, usuario)

        imagem = SimpleUploadedFile("avatar.png", b"conteudo-imagem", content_type="image/png")
        resposta = client.put(
            "/api/v1/eu/foto-perfil",
            {"arquivo": imagem},
            format="multipart",
            HTTP_AUTHORIZATION=f"Bearer {access}",
        )

        assert resposta.status_code == 200
        assert resposta.data["foto_perfil_url"].startswith("https://")
        assert resposta.data["foto_banner_url"] is None

        usuario.refresh_from_db()
        assert usuario.foto_perfil is not None

    def test_envio_de_banner_associa_arquivo_e_retorna_url(self, client):
        usuario = UsuarioFactory(email="banner@teste.com")
        access = self._autenticar(client, usuario)

        imagem = SimpleUploadedFile("banner.png", b"conteudo-banner", content_type="image/png")
        resposta = client.put(
            "/api/v1/eu/banner",
            {"arquivo": imagem},
            format="multipart",
            HTTP_AUTHORIZATION=f"Bearer {access}",
        )

        assert resposta.status_code == 200
        assert resposta.data["foto_banner_url"].startswith("https://")

        usuario.refresh_from_db()
        assert usuario.foto_banner is not None

    def test_reenvio_de_foto_de_perfil_substitui_o_arquivo_anterior(self, client):
        usuario = UsuarioFactory(email="troca-foto@teste.com")
        access = self._autenticar(client, usuario)

        primeira = SimpleUploadedFile("um.png", b"um", content_type="image/png")
        client.put(
            "/api/v1/eu/foto-perfil",
            {"arquivo": primeira},
            format="multipart",
            HTTP_AUTHORIZATION=f"Bearer {access}",
        )
        usuario.refresh_from_db()
        arquivo_antigo_id = usuario.foto_perfil_id

        segunda = SimpleUploadedFile("dois.png", b"dois", content_type="image/png")
        resposta = client.put(
            "/api/v1/eu/foto-perfil",
            {"arquivo": segunda},
            format="multipart",
            HTTP_AUTHORIZATION=f"Bearer {access}",
        )

        assert resposta.status_code == 200
        usuario.refresh_from_db()
        assert usuario.foto_perfil_id != arquivo_antigo_id

    def test_envio_sem_token_retorna_401(self, client):
        imagem = SimpleUploadedFile("avatar.png", b"x", content_type="image/png")
        resposta = client.put("/api/v1/eu/foto-perfil", {"arquivo": imagem}, format="multipart")

        assert resposta.status_code == 401

    def test_envio_sem_vendedor_associado_retorna_400(self, client):
        usuario = UsuarioFactory(email="sem-vendedor@teste.com", vendedor=None)
        access = self._autenticar(client, usuario)

        imagem = SimpleUploadedFile("avatar.png", b"x", content_type="image/png")
        resposta = client.put(
            "/api/v1/eu/foto-perfil",
            {"arquivo": imagem},
            format="multipart",
            HTTP_AUTHORIZATION=f"Bearer {access}",
        )

        assert resposta.status_code == 400
        assert resposta.data["codigo"] == "vendedor_ausente"
