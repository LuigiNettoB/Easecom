from django.db import models

from apps.core.models import ModeloMultiTenant


class MercadoLivreToken(ModeloMultiTenant):
    """Tokens OAuth do Mercado Livre do vendedor que autorizou o app.

    Um vendedor conecta uma única conta do Mercado Livre por vez — por isso
    `vendedor` é único aqui (diferente do padrão normal de
    `ModeloMultiTenant`, que permite vários registros por vendedor).
    `criado_em`/`atualizado_em` (herdados de `ModeloBase`) já cobrem o
    "created_at" pedido — não duplicamos o campo.
    """

    vendedor = models.OneToOneField(
        "contas.Vendedor", on_delete=models.CASCADE, related_name="mercado_livre_token"
    )
    ml_user_id = models.BigIntegerField(unique=True)
    access_token = models.TextField()
    refresh_token = models.TextField()
    expires_at = models.DateTimeField()

    def __str__(self):
        return f"Mercado Livre de {self.vendedor_id} (ml_user_id={self.ml_user_id})"
