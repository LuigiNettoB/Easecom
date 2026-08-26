"""Contexto da requisição atual: qual vendedor está fazendo a chamada.

Usa `contextvars` (em vez de thread-locals) para funcionar corretamente
tanto em WSGI quanto em ASGI.
"""

from contextvars import ContextVar

_vendedor_id_atual: ContextVar[str | None] = ContextVar("vendedor_id_atual", default=None)


def definir_vendedor_id(vendedor_id: str | None) -> None:
    _vendedor_id_atual.set(vendedor_id)


def obter_vendedor_id() -> str | None:
    return _vendedor_id_atual.get()


def limpar_vendedor_id() -> None:
    _vendedor_id_atual.set(None)
