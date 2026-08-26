import uuid

from django.db import models

from apps.core.managers import TenantManager


class ModeloBase(models.Model):
    """Classe base para todas as entidades do sistema."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class ModeloMultiTenant(ModeloBase):
    """Base para entidades de negócio que pertencem a um vendedor.

    O manager padrão (`objects`) já filtra pelo vendedor presente no
    contexto da requisição atual (ver `apps.core.middleware.TenantMiddleware`
    e `apps.core.tenant_context`). Use `objects_todos` apenas em código
    administrativo (admin, comandos de management, scripts de suporte).
    """

    vendedor = models.ForeignKey(
        "contas.Vendedor",
        on_delete=models.CASCADE,
        related_name="%(class)ss",
    )

    objects = TenantManager()
    objects_todos = models.Manager()  # noqa: DJ012

    class Meta:
        abstract = True
