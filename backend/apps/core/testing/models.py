from django.db import models

from apps.core.models import ModeloMultiTenant


class RecursoDeTeste(ModeloMultiTenant):
    """Model concreto usado apenas nos testes de multi-tenancy."""

    nome = models.CharField(max_length=100)
