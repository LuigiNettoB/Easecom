from datetime import timedelta
from unittest.mock import Mock, patch
from urllib.parse import parse_qs, urlparse

import pytest
import requests
from django.core import signing
from django.core.cache import cache
from django.utils import timezone

from apps.canais.models import MercadoLivreToken
from apps.canais.services import (
    SALT_STATE,
    chamar_api_mercado_livre,
    gerar_url_autorizacao,
    listar_anuncios_mercado_livre,
    obter_token_valido,
    processar_callback_oauth,
)
from apps.contas.tests.factories import SENHA_PADRAO, UsuarioFactory, VendedorFactory
from apps.core.exceptions import ErroDeNegocio

DADOS_TOKEN_ML = {
    "access_token": "APP_USR-token-inicial",
    "token_type": "bearer",
    "expires_in": 21600,
    "scope": "offline_access read write",
    "user_id": 123456789,
    "refresh_token": "TG-refresh-inicial",
}


def _resposta_mock(json_data, ok=True):
    resposta = Mock()
    resposta.ok = ok
    resposta.json.return_value = json_data
    resposta.raise_for_status = Mock()
    return resposta


@pytest.mark.django_db
class TestGerarUrlAutorizacao:
    def test_url_contem_client_id_redirect_uri_e_state_assinado(self, settings):
        settings.MERCADO_LIVRE_CLIENT_ID = "123"
        settings.MERCADO_LIVRE_REDIRECT_URI = "https://exemplo.com/callback"
        vendedor = VendedorFactory()

        url = gerar_url_autorizacao(vendedor=vendedor)

        partes = urlparse(url)
        query = parse_qs(partes.query)
        assert query["client_id"] == ["123"]
        assert query["redirect_uri"] == ["https://exemplo.com/callback"]
        assert query["response_type"] == ["code"]
        assert query["code_challenge_method"] == ["S256"]
        assert len(query["code_challenge"][0]) > 0

        dados_state = signing.loads(query["state"][0], salt=SALT_STATE)
        assert dados_state["vendedor_id"] == str(vendedor.id)
        assert len(dados_state["code_verifier"]) > 0


@pytest.mark.django_db
class TestProcessarCallbackOauth:
    def test_code_e_state_validos_criam_token(self):
        vendedor = VendedorFactory()
        state = signing.dumps(
            {"vendedor_id": str(vendedor.id), "code_verifier": "verifier-de-teste"}, salt=SALT_STATE
        )

        with patch("apps.canais.services.requests.post") as post_mock:
            post_mock.return_value = _resposta_mock(DADOS_TOKEN_ML)
            token = processar_callback_oauth(code="um-code-qualquer", state=state)
            _, kwargs = post_mock.call_args
            assert kwargs["data"]["code_verifier"] == "verifier-de-teste"

        assert token.vendedor_id == vendedor.id
        assert token.ml_user_id == DADOS_TOKEN_ML["user_id"]
        assert token.access_token == DADOS_TOKEN_ML["access_token"]
        assert token.refresh_token == DADOS_TOKEN_ML["refresh_token"]

    def test_state_adulterado_levanta_erro(self):
        with pytest.raises(ErroDeNegocio) as excecao:
            processar_callback_oauth(code="x", state="state-invalido")
        assert excecao.value.codigo == "ml_state_invalido"

    def test_mercado_livre_recusando_token_levanta_erro(self):
        vendedor = VendedorFactory()
        state = signing.dumps(
            {"vendedor_id": str(vendedor.id), "code_verifier": "verifier-de-teste"}, salt=SALT_STATE
        )

        with patch("apps.canais.services.requests.post") as post_mock:
            post_mock.return_value = _resposta_mock({}, ok=False)
            with pytest.raises(ErroDeNegocio) as excecao:
                processar_callback_oauth(code="x", state=state)

        assert excecao.value.codigo == "ml_token_recusado"


@pytest.mark.django_db
class TestObterTokenValido:
    def test_token_ainda_valido_nao_dispara_refresh(self):
        vendedor = VendedorFactory()
        token = MercadoLivreToken.objects_todos.create(
            vendedor=vendedor,
            ml_user_id=1,
            access_token="valido",
            refresh_token="refresh",
            expires_at=timezone.now() + timedelta(hours=1),
        )

        with patch("apps.canais.services.requests.post") as post_mock:
            resultado = obter_token_valido(vendedor=vendedor)
            post_mock.assert_not_called()

        assert resultado.access_token == token.access_token

    def test_token_expirado_dispara_refresh_e_atualiza(self):
        vendedor = VendedorFactory()
        MercadoLivreToken.objects_todos.create(
            vendedor=vendedor,
            ml_user_id=1,
            access_token="expirado",
            refresh_token="refresh-antigo",
            expires_at=timezone.now() - timedelta(minutes=1),
        )

        novos_dados = {
            **DADOS_TOKEN_ML,
            "access_token": "novo-token",
            "refresh_token": "novo-refresh",
        }
        with patch("apps.canais.services.requests.post") as post_mock:
            post_mock.return_value = _resposta_mock(novos_dados)
            resultado = obter_token_valido(vendedor=vendedor)
            post_mock.assert_called_once()
            _, kwargs = post_mock.call_args
            assert kwargs["data"]["grant_type"] == "refresh_token"
            assert kwargs["data"]["refresh_token"] == "refresh-antigo"

        assert resultado.access_token == "novo-token"
        assert resultado.refresh_token == "novo-refresh"

    def test_vendedor_sem_conexao_levanta_erro(self):
        vendedor = VendedorFactory()
        with pytest.raises(ErroDeNegocio) as excecao:
            obter_token_valido(vendedor=vendedor)
        assert excecao.value.codigo == "ml_nao_conectado"


@pytest.mark.django_db
class TestChamarApiMercadoLivre:
    def test_injeta_header_de_autorizacao_com_token_valido(self):
        vendedor = VendedorFactory()
        MercadoLivreToken.objects_todos.create(
            vendedor=vendedor,
            ml_user_id=1,
            access_token="token-de-teste",
            refresh_token="refresh",
            expires_at=timezone.now() + timedelta(hours=1),
        )

        with patch("apps.canais.services.requests.request") as request_mock:
            request_mock.return_value = _resposta_mock({"ok": True})
            chamar_api_mercado_livre(vendedor=vendedor, caminho="/users/me")

        _, kwargs = request_mock.call_args
        assert kwargs["headers"]["Authorization"] == "Bearer token-de-teste"


@pytest.mark.django_db
class TestEndpointsHttp:
    def _autenticar(self, client, usuario):
        login = client.post(
            "/api/v1/auth/login",
            {"email": usuario.email, "password": SENHA_PADRAO},
            format="json",
        )
        return login.data["access"]

    def test_conectar_retorna_url_de_autorizacao(self, client):
        usuario = UsuarioFactory(email="conectar@teste.com")
        access = self._autenticar(client, usuario)

        resposta = client.get(
            "/api/v1/canais/mercado-livre/conectar",
            HTTP_AUTHORIZATION=f"Bearer {access}",
        )

        assert resposta.status_code == 200
        assert "auth.mercadolivre.com" in resposta.data["url"]

    def test_conectar_sem_token_retorna_401(self, client):
        resposta = client.get("/api/v1/canais/mercado-livre/conectar")
        assert resposta.status_code == 401

    def test_status_sem_conexao_retorna_falso(self, client):
        usuario = UsuarioFactory(email="status-desconectado@teste.com")
        access = self._autenticar(client, usuario)

        resposta = client.get(
            "/api/v1/canais/mercado-livre/status",
            HTTP_AUTHORIZATION=f"Bearer {access}",
        )

        assert resposta.status_code == 200
        assert resposta.data["conectado"] is False

    def test_status_com_conexao_retorna_verdadeiro(self, client):
        usuario = UsuarioFactory(email="status-conectado@teste.com")
        MercadoLivreToken.objects_todos.create(
            vendedor=usuario.vendedor,
            ml_user_id=1,
            access_token="token",
            refresh_token="refresh",
            expires_at=timezone.now() + timedelta(hours=1),
        )
        access = self._autenticar(client, usuario)

        resposta = client.get(
            "/api/v1/canais/mercado-livre/status",
            HTTP_AUTHORIZATION=f"Bearer {access}",
        )

        assert resposta.status_code == 200
        assert resposta.data["conectado"] is True

    def test_callback_bem_sucedido_redireciona_com_sucesso(self, client, settings):
        settings.FRONTEND_URL = "http://localhost:5173"
        vendedor = VendedorFactory()
        state = signing.dumps(
            {"vendedor_id": str(vendedor.id), "code_verifier": "verifier-de-teste"}, salt=SALT_STATE
        )

        with patch("apps.canais.services.requests.post") as post_mock:
            post_mock.return_value = _resposta_mock(DADOS_TOKEN_ML)
            resposta = client.get(
                "/api/v1/canais/mercado-livre/callback",
                {"code": "um-code", "state": state},
            )

        assert resposta.status_code == 302
        assert resposta.url == "http://localhost:5173/canais?mercado_livre=conectado"

    def test_callback_com_erro_do_mercado_livre_redireciona_com_erro(self, client, settings):
        settings.FRONTEND_URL = "http://localhost:5173"

        resposta = client.get(
            "/api/v1/canais/mercado-livre/callback",
            {"error": "access_denied"},
        )

        assert resposta.status_code == 302
        assert resposta.url == "http://localhost:5173/canais?mercado_livre=erro"

    def test_callback_com_state_invalido_redireciona_com_erro(self, client, settings):
        settings.FRONTEND_URL = "http://localhost:5173"

        resposta = client.get(
            "/api/v1/canais/mercado-livre/callback",
            {"code": "um-code", "state": "invalido"},
        )

        assert resposta.status_code == 302
        assert resposta.url == "http://localhost:5173/canais?mercado_livre=erro"


ANUNCIO_COM_SKU_EM_CAMPO = {
    "id": "MLB1",
    "title": "Mousepad Gamer",
    "price": 49.9,
    "currency_id": "BRL",
    "available_quantity": 43,
    "sold_quantity": 2,
    "status": "active",
    "category_id": "MLB1716",
    "thumbnail": "http://http2.mlstatic.com/thumb-1.jpg",
    "pictures": [{"secure_url": "https://http2.mlstatic.com/foto-1.jpg"}],
    "permalink": "https://produto.mercadolivre.com.br/MLB-1",
    "seller_custom_field": "MP-01",
    "attributes": [],
}
ANUNCIO_COM_SKU_EM_ATRIBUTO = {
    "id": "MLB2",
    "title": "Cabo HDMI",
    "price": 29.9,
    "currency_id": "BRL",
    "available_quantity": 56,
    "sold_quantity": None,
    "status": "under_review",
    "category_id": "MLB38186",
    "thumbnail": "http://http2.mlstatic.com/thumb-2.jpg",
    "pictures": [],
    "permalink": "https://produto.mercadolivre.com.br/MLB-2",
    "seller_custom_field": None,
    "attributes": [{"id": "SELLER_SKU", "value_name": "CAB-HDMI"}],
}


def _api_ml_falsa(metodo, url, **kwargs):
    if url.endswith("/users/777/items/search"):
        return _resposta_mock({"results": ["MLB1", "MLB2", "MLB3"]})
    if url.endswith("/items"):
        return _resposta_mock(
            [
                {"code": 200, "body": ANUNCIO_COM_SKU_EM_CAMPO},
                {"code": 200, "body": ANUNCIO_COM_SKU_EM_ATRIBUTO},
                {"code": 404, "body": {"error": "not_found"}},
            ]
        )
    if url.endswith("/categories/MLB1716"):
        return _resposta_mock({"name": "Mouse Pads"})
    if url.endswith("/categories/MLB38186"):
        return _resposta_mock({"name": "Áudio e Vídeo"})
    raise AssertionError(f"URL inesperada: {url}")


def _vendedor_conectado(vendedor=None):
    vendedor = vendedor or VendedorFactory()
    MercadoLivreToken.objects_todos.create(
        vendedor=vendedor,
        ml_user_id=777,
        access_token="token",
        refresh_token="refresh",
        expires_at=timezone.now() + timedelta(hours=1),
    )
    return vendedor


@pytest.mark.django_db
class TestListarAnunciosMercadoLivre:
    def setup_method(self):
        cache.clear()

    def test_normaliza_anuncios_da_conta_conectada(self):
        vendedor = _vendedor_conectado()

        with patch("apps.canais.services.requests.request", side_effect=_api_ml_falsa):
            anuncios = listar_anuncios_mercado_livre(vendedor=vendedor)

        assert anuncios == [
            {
                "id": "MLB1",
                "titulo": "Mousepad Gamer",
                "sku": "MP-01",
                "categoria": "Mouse Pads",
                "preco": 49.9,
                "moeda": "BRL",
                "estoque": 43,
                "vendidos": 2,
                "status": "active",
                "foto": "https://http2.mlstatic.com/foto-1.jpg",
                "link": "https://produto.mercadolivre.com.br/MLB-1",
            },
            {
                "id": "MLB2",
                "titulo": "Cabo HDMI",
                "sku": "CAB-HDMI",
                "categoria": "Áudio e Vídeo",
                "preco": 29.9,
                "moeda": "BRL",
                "estoque": 56,
                "vendidos": 0,
                "status": "under_review",
                "foto": "https://http2.mlstatic.com/thumb-2.jpg",
                "link": "https://produto.mercadolivre.com.br/MLB-2",
            },
        ]

    def test_falha_na_api_levanta_erro_de_negocio(self):
        vendedor = _vendedor_conectado()

        with patch(
            "apps.canais.services.requests.request",
            side_effect=requests.ConnectionError("sem rede"),
        ):
            with pytest.raises(ErroDeNegocio) as excecao:
                listar_anuncios_mercado_livre(vendedor=vendedor)

        assert excecao.value.codigo == "ml_indisponivel"
        assert excecao.value.status_code == 502


@pytest.mark.django_db
class TestEndpointAnuncios:
    def setup_method(self):
        cache.clear()

    def _autenticar(self, client, usuario):
        login = client.post(
            "/api/v1/auth/login",
            {"email": usuario.email, "password": SENHA_PADRAO},
            format="json",
        )
        return login.data["access"]

    def test_retorna_anuncios_do_vendedor_conectado(self, client):
        usuario = UsuarioFactory(email="anuncios-conectado@teste.com")
        _vendedor_conectado(usuario.vendedor)
        access = self._autenticar(client, usuario)

        with patch("apps.canais.services.requests.request", side_effect=_api_ml_falsa):
            resposta = client.get(
                "/api/v1/canais/mercado-livre/anuncios",
                HTTP_AUTHORIZATION=f"Bearer {access}",
            )

        assert resposta.status_code == 200
        assert [a["id"] for a in resposta.data["anuncios"]] == ["MLB1", "MLB2"]

    def test_vendedor_sem_conexao_retorna_400(self, client):
        usuario = UsuarioFactory(email="anuncios-desconectado@teste.com")
        access = self._autenticar(client, usuario)

        resposta = client.get(
            "/api/v1/canais/mercado-livre/anuncios",
            HTTP_AUTHORIZATION=f"Bearer {access}",
        )

        assert resposta.status_code == 400
        assert resposta.data["codigo"] == "ml_nao_conectado"

    def test_sem_token_retorna_401(self, client):
        resposta = client.get("/api/v1/canais/mercado-livre/anuncios")
        assert resposta.status_code == 401
