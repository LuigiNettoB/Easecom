from django.db import models

from apps.core.models import ModeloMultiTenant


class Fornecedor(ModeloMultiTenant):
    """Um fornecedor que abastece os produtos do vendedor."""

    nome = models.CharField(max_length=150)
    email = models.EmailField(blank=True)
    ativo = models.BooleanField(default=True)

    class Meta:
        ordering = ["nome"]
        constraints = [
            models.UniqueConstraint(
                fields=["vendedor", "email"], name="fornecedor_email_unico_por_vendedor"
            ),
        ]

    def __str__(self):
        return self.nome
