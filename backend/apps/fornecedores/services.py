from django.db import IntegrityError, transaction

from apps.core.exceptions import ErroDeNegocio
from apps.fornecedores.models import Fornecedor


def criar_fornecedor(*, vendedor, nome, email="", ativo=True) -> Fornecedor:
    """Cria um fornecedor, impedindo e-mail duplicado para o mesmo vendedor."""
    nome = nome.strip()
    email = email.strip().lower()
    if email and Fornecedor.objects_todos.filter(
        vendedor=vendedor, email__iexact=email
    ).exists():
        raise _erro_email_duplicado()

    try:
        with transaction.atomic():
            return Fornecedor.objects_todos.create(
                vendedor=vendedor, nome=nome, email=email, ativo=ativo
            )
    except IntegrityError as exc:
        raise _erro_email_duplicado() from exc


def atualizar_fornecedor(*, fornecedor, nome=None, email=None, ativo=None) -> Fornecedor:
    """Atualiza apenas os campos enviados (semântica de PATCH)."""
    if nome is not None:
        fornecedor.nome = nome.strip()
    if email is not None:
        email = email.strip().lower()
        if email and Fornecedor.objects_todos.filter(
            vendedor_id=fornecedor.vendedor_id, email__iexact=email
        ).exclude(pk=fornecedor.pk).exists():
            raise _erro_email_duplicado()
        fornecedor.email = email
    if ativo is not None:
        fornecedor.ativo = ativo
    fornecedor.save()
    return fornecedor


def excluir_fornecedor(*, fornecedor) -> None:
    fornecedor.delete()


def _erro_email_duplicado() -> ErroDeNegocio:
    return ErroDeNegocio(
        mensagem="Já existe um fornecedor com este e-mail.",
        codigo="fornecedor_email_duplicado",
        status_code=409,
        erros_de_campo=[
            {"campo": "email", "mensagens": ["Já existe um fornecedor com este e-mail."]}
        ],
    )
