import logging
from datetime import UTC, datetime

from rest_framework.response import Response
from rest_framework.views import exception_handler as tratador_padrao_drf

from apps.core.exceptions import ErroDeNegocio

logger = logging.getLogger(__name__)


def tratador_de_excecao(exc, context):
    """Padroniza toda resposta de erro da API.

    Formato: timestamp, status, codigo, mensagem e, opcionalmente,
    erros_de_campo. Erros inesperados nunca vazam traceback na resposta —
    apenas 500 genérico, com o traceback registrado no log.
    """
    if isinstance(exc, ErroDeNegocio):
        return _resposta_erro(exc.status_code, exc.codigo, exc.mensagem, exc.erros_de_campo)

    response = tratador_padrao_drf(exc, context)

    if response is not None:
        codigo, mensagem, erros_de_campo = _extrair_detalhes(exc, response)
        return _resposta_erro(response.status_code, codigo, mensagem, erros_de_campo)

    logger.exception("Erro interno não tratado", exc_info=exc)
    return _resposta_erro(
        500, "erro_interno", "Ocorreu um erro inesperado. Tente novamente mais tarde."
    )


def _extrair_detalhes(exc, response):
    codigo = getattr(exc, "default_code", None) or "erro"
    detail = response.data
    erros_de_campo = None

    if isinstance(detail, dict):
        mensagem = str(detail.get("detail", "Erro de validação."))
        erros_de_campo = [
            {
                "campo": campo,
                "mensagens": mensagens if isinstance(mensagens, list) else [str(mensagens)],
            }
            for campo, mensagens in detail.items()
            if campo != "detail"
        ] or None
    elif isinstance(detail, list):
        mensagem = "; ".join(str(item) for item in detail)
    else:
        mensagem = str(detail)

    return codigo, mensagem, erros_de_campo


def _resposta_erro(status_code, codigo, mensagem, erros_de_campo=None):
    corpo = {
        "timestamp": datetime.now(UTC).isoformat(),
        "status": status_code,
        "codigo": codigo,
        "mensagem": mensagem,
    }
    if erros_de_campo:
        corpo["erros_de_campo"] = erros_de_campo
    return Response(corpo, status=status_code)
