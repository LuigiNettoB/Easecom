"""Acesso ao provedor de IA (qualquer API compatível com a da OpenAI).

O padrão é o Google Gemini, mas Groq, o servidor da Mauá ou a própria
OpenAI funcionam trocando só `LLM_BASE_URL`, a chave e `LLM_MODELOS` no
`.env`. `LLM_MODELOS` é uma lista em ordem de preferência: se um modelo
estiver sobrecarregado, sem cota ou indisponível, o próximo é tentado.
"""

import logging
from dataclasses import dataclass

import openai
from django.conf import settings

from apps.core.exceptions import ErroDeNegocio

logger = logging.getLogger(__name__)

TEMPERATURA = 0.2

# erros em que vale tentar o próximo modelo da lista
_ERROS_DE_MODELO = (
    openai.RateLimitError,
    openai.InternalServerError,
    openai.NotFoundError,
    openai.APITimeoutError,
)


class AssistenteIndisponivel(ErroDeNegocio):
    codigo = "assistente_indisponivel"
    status_code = 503


@dataclass
class RespostaDoModelo:
    mensagem: object  # ChatCompletionMessage do SDK
    modelo: str


def gerar_resposta(*, mensagens: list, ferramentas: list, modelo: str | None = None):
    """Envia a conversa ao provedor e devolve a próxima mensagem da IA.

    Com `modelo`, usa só ele (necessário no meio de uma resposta com
    ferramentas: alguns modelos exigem continuar no mesmo). Sem `modelo`,
    percorre `LLM_MODELOS` até um responder.
    """
    if not settings.LLM_API_KEY:
        raise AssistenteIndisponivel(
            mensagem="O assistente não está configurado neste ambiente.",
            codigo="assistente_nao_configurado",
        )

    cliente = openai.OpenAI(
        api_key=settings.LLM_API_KEY,
        base_url=settings.LLM_BASE_URL,
        timeout=settings.LLM_TIMEOUT,
        max_retries=1,
    )
    candidatos = [modelo] if modelo else list(settings.LLM_MODELOS)
    ultimo_erro = None

    for candidato in candidatos:
        try:
            resposta = cliente.chat.completions.create(
                model=candidato,
                messages=mensagens,
                tools=ferramentas,
                temperature=TEMPERATURA,
            )
        except _ERROS_DE_MODELO as exc:
            logger.warning("Modelo %s indisponível para o assistente: %s", candidato, exc)
            ultimo_erro = exc
            continue
        except (openai.AuthenticationError, openai.PermissionDeniedError) as exc:
            logger.error("Chave do provedor de IA recusada: %s", exc)
            raise AssistenteIndisponivel(
                mensagem="O assistente está com a configuração inválida. Avise o suporte.",
                codigo="assistente_nao_configurado",
            ) from exc
        except openai.OpenAIError as exc:
            logger.exception("Erro inesperado do provedor de IA")
            raise AssistenteIndisponivel(
                mensagem="O assistente não conseguiu responder agora. Tente novamente."
            ) from exc

        if not resposta.choices:
            ultimo_erro = None
            continue
        return RespostaDoModelo(mensagem=resposta.choices[0].message, modelo=candidato)

    if isinstance(ultimo_erro, openai.RateLimitError):
        raise AssistenteIndisponivel(
            mensagem=(
                "O assistente atingiu o limite de uso do provedor de IA. "
                "Tente novamente mais tarde."
            ),
            codigo="assistente_sem_cota",
        )
    raise AssistenteIndisponivel(
        mensagem="O assistente está ocupado no momento. Tente novamente em instantes."
    )
