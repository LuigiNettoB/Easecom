from django.db import IntegrityError, transaction

from apps.arquivos.services import enviar_arquivo
from apps.contas.models import Perfil, Usuario, Vendedor
from apps.core.exceptions import ErroDeNegocio


def cadastrar_vendedor_e_administrador(*, nome_vendedor, nome_usuario, email, senha) -> Usuario:
    """Cria um vendedor e seu usuário administrador em uma única transação."""
    email_normalizado = email.strip().lower()

    if Usuario.objects.filter(email__iexact=email_normalizado).exists():
        raise _erro_email_duplicado()

    try:
        with transaction.atomic():
            vendedor = Vendedor.objects.create(nome=nome_vendedor)
            usuario = Usuario.objects.create_user(
                email=email_normalizado,
                senha=senha,
                nome=nome_usuario,
                vendedor=vendedor,
                perfil=Perfil.ADMINISTRADOR,
            )
    except IntegrityError as exc:
        raise _erro_email_duplicado() from exc

    return usuario


def trocar_senha(*, usuario: Usuario, senha_atual, senha_nova) -> None:
    """Troca a senha do usuário autenticado, conferindo a senha atual antes."""
    if not usuario.check_password(senha_atual):
        raise ErroDeNegocio(
            mensagem="Senha atual incorreta.",
            codigo="senha_atual_incorreta",
            status_code=400,
            erros_de_campo=[{"campo": "senha_atual", "mensagens": ["Senha atual incorreta."]}],
        )

    usuario.set_password(senha_nova)
    usuario.save(update_fields=["password"])


def atualizar_foto_perfil(*, usuario: Usuario, arquivo_upload) -> Usuario:
    """Envia uma nova foto de perfil para o Storage e a associa ao usuário."""
    arquivo = enviar_arquivo(vendedor=usuario.vendedor, arquivo_upload=arquivo_upload)
    usuario.foto_perfil = arquivo
    usuario.save(update_fields=["foto_perfil", "atualizado_em"])
    return usuario


def atualizar_foto_banner(*, usuario: Usuario, arquivo_upload) -> Usuario:
    """Envia um novo banner para o Storage e o associa ao usuário."""
    arquivo = enviar_arquivo(vendedor=usuario.vendedor, arquivo_upload=arquivo_upload)
    usuario.foto_banner = arquivo
    usuario.save(update_fields=["foto_banner", "atualizado_em"])
    return usuario


def _erro_email_duplicado() -> ErroDeNegocio:
    return ErroDeNegocio(
        mensagem="Já existe um usuário cadastrado com este e-mail.",
        codigo="email_duplicado",
        status_code=409,
        erros_de_campo=[{"campo": "email", "mensagens": ["Este e-mail já está em uso."]}],
    )
