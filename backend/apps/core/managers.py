from django.db import models

from apps.core import tenant_context


class TenantManager(models.Manager):
    """Filtra automaticamente pelo vendedor do contexto da requisição atual.

    Armadilha: se não houver vendedor no contexto (comando de management,
    shell, código fora de uma requisição autenticada), o queryset retornado
    é vazio — de propósito, para nunca vazar dados entre vendedores por
    esquecimento. Use `objects_todos` nesses casos.
    """

    def get_queryset(self):
        queryset = super().get_queryset()
        vendedor_id = tenant_context.obter_vendedor_id()
        if vendedor_id is None:
            return queryset.none()
        return queryset.filter(vendedor_id=vendedor_id)
