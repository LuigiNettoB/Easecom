from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models

from apps.contas.managers import UsuarioManager
from apps.core.models import ModeloBase


class Vendedor(ModeloBase):
    """O tenant do sistema: uma conta de vendedor de e-commerce."""

    nome = models.CharField(max_length=150)

    class Meta:
        ordering = ["nome"]

    def __str__(self):
        return self.nome


class Perfil(models.TextChoices):
    ADMINISTRADOR = "ADMINISTRADOR", "Administrador"
    OPERADOR = "OPERADOR", "Operador"
    FINANCEIRO = "FINANCEIRO", "Financeiro"


class Usuario(ModeloBase, AbstractBaseUser, PermissionsMixin):
    """Usuário autenticado do sistema, identificado por e-mail.

    `vendedor` é opcional apenas para permitir superusuários de plataforma
    (via `createsuperuser`, usados só para acessar o Django admin). Todo
    usuário criado pelo fluxo de cadastro (`/api/v1/auth/cadastro`) sempre
    tem um vendedor.
    """

    email = models.EmailField(unique=True)
    nome = models.CharField(max_length=150)
    vendedor = models.ForeignKey(
        Vendedor,
        on_delete=models.CASCADE,
        related_name="usuarios",
        null=True,
        blank=True,
    )
    perfil = models.CharField(max_length=20, choices=Perfil.choices, default=Perfil.OPERADOR)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UsuarioManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["nome"]

    class Meta:
        ordering = ["email"]

    def __str__(self):
        return self.email
