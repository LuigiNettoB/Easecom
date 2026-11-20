from django.conf import settings
from django.db import models

from apps.core.models import ModeloBase, ModeloMultiTenant


class PapelMensagem(models.TextChoices):
    USUARIO = "USUARIO", "Usuário"
    ASSISTENTE = "ASSISTENTE", "Assistente"


class Conversa(ModeloMultiTenant):
    """Uma conversa de um usuário com o assistente de vendas.

    Pertence ao vendedor (isolamento multi-tenant) e ao usuário que a
    iniciou: colegas da mesma loja não veem as conversas uns dos outros.
    """

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="conversas_assistente",
    )
    titulo = models.CharField(max_length=120)

    class Meta:
        ordering = ["-atualizado_em"]

    def __str__(self):
        return self.titulo


class Mensagem(ModeloBase):
    """Uma pergunta do usuário ou uma resposta do assistente.

    Tabela filha de `Conversa` (como `ItemPedido` é de `Pedido`): o
    isolamento vem da conversa. Só o texto final fica salvo — as consultas
    que o assistente fez para responder não são guardadas.
    """

    conversa = models.ForeignKey(Conversa, on_delete=models.CASCADE, related_name="mensagens")
    papel = models.CharField(max_length=12, choices=PapelMensagem.choices)
    conteudo = models.TextField()

    class Meta:
        ordering = ["criado_em"]

    def __str__(self):
        return f"{self.get_papel_display()}: {self.conteudo[:40]}"
