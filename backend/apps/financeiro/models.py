from django.db import models
from django.utils import timezone

from apps.core.models import ModeloMultiTenant
from apps.pedidos.models import Canal


class TipoLancamento(models.TextChoices):
    RECEITA = "RECEITA", "Receita"
    TAXA = "TAXA", "Taxa"
    DESPESA = "DESPESA", "Despesa"


class Lancamento(ModeloMultiTenant):
    """Lançamento manual (despesas, taxas ou receitas avulsas) do vendedor.

    Receitas e taxas dos marketplaces não ficam aqui: são derivadas dos
    pedidos sincronizados (`apps.pedidos`) no resumo do financeiro. Este
    model guarda só o que é manual — por enquanto, em especial as despesas.
    """

    tipo = models.CharField(max_length=10, choices=TipoLancamento.choices)
    descricao = models.CharField(max_length=255)
    canal = models.CharField(max_length=30, choices=Canal.choices, blank=True)
    valor = models.DecimalField(max_digits=12, decimal_places=2)
    data = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-data", "-criado_em"]

    def __str__(self):
        return f"{self.get_tipo_display()} {self.descricao}"
