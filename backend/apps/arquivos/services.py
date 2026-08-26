import uuid

from django.conf import settings
from supabase import create_client

from apps.arquivos.models import Arquivo
from apps.contas.models import Vendedor
from apps.core.exceptions import ErroDeNegocio

URL_ASSINADA_VALIDADE_SEGUNDOS = 3600


def _cliente_storage():
    cliente = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    return cliente.storage.from_(settings.SUPABASE_STORAGE_BUCKET)


def _gerar_caminho_storage(*, vendedor_id, nome_original: str) -> str:
    extensao = nome_original.rsplit(".", 1)[-1] if "." in nome_original else ""
    sufixo = f".{extensao}" if extensao else ""
    return f"{vendedor_id}/{uuid.uuid4()}{sufixo}"


def enviar_arquivo(*, vendedor: Vendedor, arquivo_upload) -> Arquivo:
    """Sobe um arquivo para o bucket do Supabase e registra os metadados."""
    if vendedor is None:
        raise ErroDeNegocio(
            mensagem="Usuário sem vendedor associado não pode enviar arquivos.",
            codigo="vendedor_ausente",
            status_code=400,
        )

    conteudo = arquivo_upload.read()
    content_type = arquivo_upload.content_type or "application/octet-stream"
    caminho_storage = _gerar_caminho_storage(
        vendedor_id=vendedor.id, nome_original=arquivo_upload.name
    )

    _cliente_storage().upload(
        caminho_storage,
        conteudo,
        {"content-type": content_type},
    )

    return Arquivo.objects.create(
        vendedor=vendedor,
        nome_original=arquivo_upload.name,
        caminho_storage=caminho_storage,
        content_type=content_type,
        tamanho_bytes=len(conteudo),
    )


def obter_url_arquivo(*, arquivo: Arquivo) -> str:
    """Retorna a URL para baixar o arquivo — pública ou assinada, conforme o bucket."""
    storage = _cliente_storage()

    if settings.SUPABASE_STORAGE_BUCKET_PUBLICO:
        return storage.get_public_url(arquivo.caminho_storage)

    resposta = storage.create_signed_url(arquivo.caminho_storage, URL_ASSINADA_VALIDADE_SEGUNDOS)
    return resposta["signedURL"]
