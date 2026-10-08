import base64
import hashlib
import logging
import re
import secrets
from datetime import timedelta
from urllib.parse import urlencode

import requests
from django.conf import settings
from django.core import signing
from django.core.cache import cache
from django.utils import timezone

from apps.canais.models import MercadoLivreToken
from apps.contas.models import Vendedor
from apps.core.exceptions import ErroDeNegocio, RecursoNaoEncontrado

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


# --- Anúncios do vendedor ---------------------------------------------------

# O multiget `/items?ids=` aceita no máximo 20 ids por chamada.
TAMANHO_LOTE_MULTIGET = 20
LIMITE_ANUNCIOS = 100
CAMPOS_ANUNCIO = (
    "id,title,price,currency_id,available_quantity,sold_quantity,status,"
    "category_id,thumbnail,pictures,permalink,seller_custom_field,attributes"
)
# Nome de categoria praticamente nunca muda — evita uma chamada por categoria
# a cada carregamento do catálogo.
VALIDADE_CACHE_CATEGORIA_SEGUNDOS = 60 * 60 * 24


def _chamar_api_ou_erro(*, vendedor: Vendedor, caminho: str, **kwargs) -> dict | list:
    try:
        return chamar_api_mercado_livre(vendedor=vendedor, caminho=caminho, **kwargs).json()
    except requests.RequestException as exc:
        logger.warning("Falha ao consultar a API do Mercado Livre (%s): %s", caminho, exc)
        raise ErroDeNegocio(
            mensagem="Não foi possível buscar os dados no Mercado Livre agora.",
            codigo="ml_indisponivel",
            status_code=502,
        ) from exc


def _nome_categoria(*, vendedor: Vendedor, categoria_id: str) -> str:
    chave = f"ml_categoria_{categoria_id}"
    nome = cache.get(chave)
    if nome is None:
        nome = _chamar_api_ou_erro(vendedor=vendedor, caminho=f"/categories/{categoria_id}")["name"]
        cache.set(chave, nome, VALIDADE_CACHE_CATEGORIA_SEGUNDOS)
    return nome


def _sku_do_anuncio(anuncio: dict) -> str:
    if anuncio.get("seller_custom_field"):
        return anuncio["seller_custom_field"]
    for atributo in anuncio.get("attributes") or []:
        if atributo.get("id") == "SELLER_SKU" and atributo.get("value_name"):
            return atributo["value_name"]
    return ""


def _foto_do_anuncio(anuncio: dict) -> str:
    fotos = anuncio.get("pictures") or []
    if fotos and fotos[0].get("secure_url"):
        return fotos[0]["secure_url"]
    return (anuncio.get("thumbnail") or "").replace("http://", "https://", 1)


def _normalizar_anuncio(*, vendedor: Vendedor, anuncio: dict) -> dict:
    return {
        "id": anuncio["id"],
        "titulo": anuncio["title"],
        "sku": _sku_do_anuncio(anuncio),
        "categoria": _nome_categoria(vendedor=vendedor, categoria_id=anuncio["category_id"]),
        "preco": anuncio["price"],
        "moeda": anuncio["currency_id"],
        "estoque": anuncio["available_quantity"],
        "vendidos": anuncio.get("sold_quantity") or 0,
        "status": anuncio["status"],
        "foto": _foto_do_anuncio(anuncio),
        "link": anuncio.get("permalink") or "",
    }


def listar_anuncios_mercado_livre(*, vendedor: Vendedor) -> list[dict]:
    """Lista os anúncios que o vendedor tem na conta conectada do Mercado Livre."""
    token = obter_token_valido(vendedor=vendedor)
    busca = _chamar_api_ou_erro(
        vendedor=vendedor,
        caminho=f"/users/{token.ml_user_id}/items/search",
        params={"limit": LIMITE_ANUNCIOS},
    )
    ids = busca["results"]

    anuncios = []
    for inicio in range(0, len(ids), TAMANHO_LOTE_MULTIGET):
        lote = ids[inicio : inicio + TAMANHO_LOTE_MULTIGET]
        respostas = _chamar_api_ou_erro(
            vendedor=vendedor,
            caminho="/items",
            params={"ids": ",".join(lote), "attributes": CAMPOS_ANUNCIO},
        )
        anuncios.extend(r["body"] for r in respostas if r.get("code") == 200)

    return [_normalizar_anuncio(vendedor=vendedor, anuncio=anuncio) for anuncio in anuncios]


def _descricao_do_anuncio(*, vendedor: Vendedor, anuncio_id: str) -> str:
    # Anúncio sem descrição cadastrada responde 404 — não é erro pra quem chama.
    try:
        resposta = chamar_api_mercado_livre(
            vendedor=vendedor, caminho=f"/items/{anuncio_id}/description"
        )
    except requests.RequestException:
        return ""
    return resposta.json().get("plain_text") or ""


def obter_anuncio_mercado_livre(*, vendedor: Vendedor, anuncio_id: str) -> dict:
    """Detalha um anúncio da conta conectada (fotos, descrição, ficha técnica)."""
    nao_encontrado = RecursoNaoEncontrado(mensagem="Anúncio não encontrado.")
    # O id vai direto no caminho da URL da API — só aceita o formato do ML (ex.: MLB123).
    if not re.fullmatch(r"[A-Z]{3}\d+", anuncio_id):
        raise nao_encontrado
    token = obter_token_valido(vendedor=vendedor)
    try:
        anuncio = chamar_api_mercado_livre(vendedor=vendedor, caminho=f"/items/{anuncio_id}").json()
    except requests.HTTPError as exc:
        if exc.response is not None and exc.response.status_code in (400, 404):
            raise nao_encontrado from exc
        raise ErroDeNegocio(
            mensagem="Não foi possível buscar os dados no Mercado Livre agora.",
            codigo="ml_indisponivel",
            status_code=502,
        ) from exc
    except requests.RequestException as exc:
        raise ErroDeNegocio(
            mensagem="Não foi possível buscar os dados no Mercado Livre agora.",
            codigo="ml_indisponivel",
            status_code=502,
        ) from exc

    # A API devolve anúncios de qualquer vendedor; só mostramos os da conta conectada.
    if anuncio.get("seller_id") != token.ml_user_id:
        raise nao_encontrado

    fotos = [foto["secure_url"] for foto in anuncio.get("pictures") or [] if foto.get("secure_url")]
    return {
        **_normalizar_anuncio(vendedor=vendedor, anuncio=anuncio),
        "fotos": fotos or [_foto_do_anuncio(anuncio)],
        "descricao": _descricao_do_anuncio(vendedor=vendedor, anuncio_id=anuncio["id"]),
        "condicao": anuncio.get("condition") or "",
        "garantia": anuncio.get("warranty") or "",
        "frete_gratis": bool((anuncio.get("shipping") or {}).get("free_shipping")),
        "criado_em": anuncio.get("date_created"),
        "atributos": [
            {"nome": atributo["name"], "valor": atributo["value_name"]}
            for atributo in anuncio.get("attributes") or []
            if atributo.get("value_name")
        ],
    }


# --- Pedidos (vendas) do vendedor --------------------------------------------

# A busca de pedidos aceita no máximo 51 por página.
TAMANHO_PAGINA_PEDIDOS = 51
LIMITE_PEDIDOS = 500


def _normalizar_pedido(*, vendedor: Vendedor, pedido: dict) -> dict:
    pagamento = (pedido.get("payments") or [{}])[0]
    return {
        "id": str(pedido["id"]),
        "data": pedido["date_created"],
        "status": pedido["status"],
        "total": pedido["total_amount"],
        "comprador": (pedido.get("buyer") or {}).get("nickname") or "",
        "forma_pagamento": pagamento.get("payment_type") or "",
        "parcelas": pagamento.get("installments") or 1,
        "itens": [
            {
                "anuncio_id": item["item"]["id"],
                "titulo": item["item"]["title"],
                "categoria": _nome_categoria(
                    vendedor=vendedor, categoria_id=item["item"]["category_id"]
                ),
                "quantidade": item["quantity"],
                "preco_unitario": item["unit_price"],
                # tarifa de venda do ML, cobrada por unidade
                "tarifa": item.get("sale_fee") or 0,
            }
            for item in pedido.get("order_items") or []
        ],
    }


def listar_pedidos_mercado_livre(*, vendedor: Vendedor) -> list[dict]:
    """Lista os pedidos recebidos na conta conectada do Mercado Livre, mais recentes primeiro."""
    token = obter_token_valido(vendedor=vendedor)
    pedidos: list[dict] = []
    while len(pedidos) < LIMITE_PEDIDOS:
        pagina = _chamar_api_ou_erro(
            vendedor=vendedor,
            caminho="/orders/search",
            params={
                "seller": token.ml_user_id,
                "sort": "date_desc",
                "limit": TAMANHO_PAGINA_PEDIDOS,
                "offset": len(pedidos),
            },
        )
        pedidos.extend(pagina["results"])
        if not pagina["results"] or len(pedidos) >= pagina["paging"]["total"]:
            break
    return [_normalizar_pedido(vendedor=vendedor, pedido=pedido) for pedido in pedidos]
