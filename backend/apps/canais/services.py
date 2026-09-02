import base64
import hashlib
import logging
import secrets
from datetime import timedelta
from urllib.parse import urlencode

import requests
from django.conf import settings
from django.core import signing
from django.utils import timezone

from apps.canais.models import MercadoLivreToken
from apps.contas.models import Vendedor
from apps.core.exceptions import ErroDeNegocio

logger = logging.getLogger(__name__)

URL_AUTORIZACAO_ML = "https://auth.mercadolivre.com.br/authorization"
URL_TOKEN_ML = "https://api.mercadolibre.com/oauth/token"
URL_BASE_API_ML = "https://api.mercadolibre.com"

# Renova um pouco antes da expiração de fato, pra nunca disparar uma chamada
# à API com um token que expira no meio do caminho.
MARGEM_EXPIRACAO_TOKEN = timedelta(minutes=5)

# `state` fica só alguns minutos válido — tempo de sobra pro usuário concluir
# o login/autorização no site do Mercado Livre.
SALT_STATE = "canais.mercado_livre.state"
VALIDADE_STATE_SEGUNDOS = 60 * 10


# --- Integração real com a API do Mercado Livre (OAuth) -------------------
#
# Gera a URL de autorização, troca o `code` por tokens, renova via
# `refresh_token` e serve de base pra qualquer chamada autenticada futura à
# API.


def _gerar_par_pkce() -> tuple[str, str]:
    """Gera o par (code_verifier, code_challenge) exigido pelo app no Mercado Livre.

    PKCE (RFC 7636): o `code_verifier` fica só em memória do lado do backend
    (viaja escondido dentro do `state` assinado) até a troca do `code`; só o
    hash dele (`code_challenge`) é exposto na URL de autorização.
    """
    code_verifier = secrets.token_urlsafe(64)
    code_challenge = (
        base64.urlsafe_b64encode(hashlib.sha256(code_verifier.encode("ascii")).digest())
        .decode("ascii")
        .rstrip("=")
    )
    return code_verifier, code_challenge


def gerar_url_autorizacao(*, vendedor: Vendedor) -> str:
    """Monta a URL para o vendedor autorizar o app no Mercado Livre.

    O `state` carrega o id do vendedor e o `code_verifier` do PKCE assinados
    criptograficamente (não crus) porque o callback é uma navegação que vem
    direto do domínio do Mercado Livre — não tem como carregar nosso JWT nela
    nem manter isso em sessão, então é assim que identificamos quem iniciou o
    fluxo (e garantimos que não foi forjado).
    """
    code_verifier, code_challenge = _gerar_par_pkce()
    state = signing.dumps(
        {"vendedor_id": str(vendedor.id), "code_verifier": code_verifier}, salt=SALT_STATE
    )
    parametros = {
        "response_type": "code",
        "client_id": settings.MERCADO_LIVRE_CLIENT_ID,
        "redirect_uri": settings.MERCADO_LIVRE_REDIRECT_URI,
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }
    return f"{URL_AUTORIZACAO_ML}?{urlencode(parametros)}"


def _decodificar_state(state: str) -> tuple[Vendedor, str]:
    try:
        dados = signing.loads(state, salt=SALT_STATE, max_age=VALIDADE_STATE_SEGUNDOS)
    except signing.BadSignature as exc:
        raise ErroDeNegocio(
            mensagem="Solicitação de autorização inválida ou expirada.",
            codigo="ml_state_invalido",
            status_code=400,
        ) from exc

    try:
        vendedor = Vendedor.objects.get(id=dados["vendedor_id"])
    except Vendedor.DoesNotExist as exc:
        raise ErroDeNegocio(
            mensagem="Vendedor não encontrado.",
            codigo="vendedor_nao_encontrado",
            status_code=400,
        ) from exc

    return vendedor, dados["code_verifier"]


def _trocar_por_token(dados_requisicao: dict) -> dict:
    try:
        resposta = requests.post(URL_TOKEN_ML, data=dados_requisicao, timeout=10)
    except requests.RequestException as exc:
        raise ErroDeNegocio(
            mensagem="Não foi possível falar com o Mercado Livre agora.",
            codigo="ml_indisponivel",
            status_code=502,
        ) from exc

    if not resposta.ok:
        logger.warning(
            "Mercado Livre recusou troca de token (status=%s): %s",
            resposta.status_code,
            resposta.text,
        )
        raise ErroDeNegocio(
            mensagem="O Mercado Livre recusou a solicitação de token.",
            codigo="ml_token_recusado",
            status_code=400,
        )

    return resposta.json()


def _salvar_tokens(*, vendedor: Vendedor, dados: dict) -> MercadoLivreToken:
    expira_em = timezone.now() + timedelta(seconds=dados["expires_in"])
    token, _ = MercadoLivreToken.objects_todos.update_or_create(
        vendedor=vendedor,
        defaults={
            "ml_user_id": dados["user_id"],
            "access_token": dados["access_token"],
            "refresh_token": dados["refresh_token"],
            "expires_at": expira_em,
        },
    )
    return token


def processar_callback_oauth(*, code: str, state: str) -> MercadoLivreToken:
    """Troca o `code` do callback OAuth por tokens e os salva no banco."""
    vendedor, code_verifier = _decodificar_state(state)
    dados = _trocar_por_token(
        {
            "grant_type": "authorization_code",
            "client_id": settings.MERCADO_LIVRE_CLIENT_ID,
            "client_secret": settings.MERCADO_LIVRE_CLIENT_SECRET,
            "code": code,
            "redirect_uri": settings.MERCADO_LIVRE_REDIRECT_URI,
            "code_verifier": code_verifier,
        }
    )
    return _salvar_tokens(vendedor=vendedor, dados=dados)


def esta_conectado_ao_mercado_livre(*, vendedor: Vendedor) -> bool:
    """Diz se o vendedor já conectou uma conta do Mercado Livre — sem chamar a API."""
    return MercadoLivreToken.objects_todos.filter(vendedor=vendedor).exists()


def obter_token_valido(*, vendedor: Vendedor) -> MercadoLivreToken:
    """Retorna um token de acesso válido, renovando-o via refresh se preciso."""
    try:
        token = MercadoLivreToken.objects_todos.get(vendedor=vendedor)
    except MercadoLivreToken.DoesNotExist as exc:
        raise ErroDeNegocio(
            mensagem="Este vendedor ainda não conectou uma conta do Mercado Livre.",
            codigo="ml_nao_conectado",
            status_code=400,
        ) from exc

    if timezone.now() < token.expires_at - MARGEM_EXPIRACAO_TOKEN:
        return token

    dados = _trocar_por_token(
        {
            "grant_type": "refresh_token",
            "client_id": settings.MERCADO_LIVRE_CLIENT_ID,
            "client_secret": settings.MERCADO_LIVRE_CLIENT_SECRET,
            "refresh_token": token.refresh_token,
        }
    )
    return _salvar_tokens(vendedor=vendedor, dados=dados)


def chamar_api_mercado_livre(
    *, vendedor: Vendedor, metodo: str = "GET", caminho: str, **kwargs
) -> requests.Response:
    """Faz uma chamada autenticada à API do Mercado Livre em nome do vendedor.

    Garante um `access_token` válido (renovando se preciso) antes de montar a
    requisição — quem chama essa função nunca lida com token manualmente.
    """
    token = obter_token_valido(vendedor=vendedor)
    headers = {"Authorization": f"Bearer {token.access_token}", **kwargs.pop("headers", {})}
    resposta = requests.request(
        metodo, f"{URL_BASE_API_ML}{caminho}", headers=headers, timeout=10, **kwargs
    )
    resposta.raise_for_status()
    return resposta
