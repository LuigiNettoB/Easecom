from django.db import models

from apps.core.models import ModeloMultiTenant


class Arquivo(ModeloMultiTenant):
    """Metadados de um arquivo enviado ao Supabase Storage.

    O conteúdo em si vive no bucket do Supabase; este model só guarda o
    caminho e os metadados, e é quem garante isolamento entre vendedores
    (via `ModeloMultiTenant`/`TenantManager`) — o Supabase Storage por si só
    não sabe nada sobre vendedores.
    """

    nome_original = models.CharField(max_length=255)
    caminho_storage = models.CharField(max_length=500, unique=True)
    content_type = models.CharField(max_length=100)
    tamanho_bytes = models.PositiveBigIntegerField()

    def __str__(self):
        return self.nome_original
