from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from apps.financeiro.models import Lancamento, TipoLancamento
from apps.pedidos.models import ItemPedido, Pedido, StatusPedido


def obter_resumo_financeiro(*, vendedor, realizado_de=None, realizado_ate=None) -> dict:
    """Indicadores financeiros do vendedor.

    Receitas e taxas são derivadas dos pedidos pagos sincronizados
    (`apps.pedidos`); despesas vêm dos lançamentos manuais (tipo `DESPESA`).
    `realizado_de`/`realizado_ate` filtram por período (ISO datetime).
    """
    pagos = _pedidos_pagos(vendedor=vendedor, realizado_de=realizado_de, realizado_ate=realizado_ate)
    receitas = pagos.aggregate(total=Sum("valor_pago"))["total"] or Decimal("0")
    taxas = (
        ItemPedido.objects.filter(pedido__in=pagos).aggregate(total=Sum("taxa_venda"))["total"]
        or Decimal("0")
    )
    despesas = (
        _lancamentos_manuais(vendedor=vendedor, realizado_de=realizado_de, realizado_ate=realizado_ate)
        .filter(tipo=TipoLancamento.DESPESA)
        .aggregate(total=Sum("valor"))["total"]
        or Decimal("0")
    )

    if receitas:
        margem = ((receitas - despesas - taxas) / receitas * 100).quantize(Decimal("0.01"))
    else:
        margem = Decimal("0")

    return {
        "receitas": receitas,
        "despesas": despesas,
        "taxas": taxas,
        "margem_liquida": margem,
    }


def criar_lancamento(*, vendedor, dados) -> Lancamento:
    """Registra um lançamento manual (ex.: despesa com frete ou compra)."""
    with transaction.atomic():
        return Lancamento.objects_todos.create(
            vendedor=vendedor,
            tipo=dados["tipo"],
            descricao=dados["descricao"].strip(),
            canal=dados.get("canal", ""),
            valor=dados["valor"],
            data=dados.get("data", timezone.now()),
        )


def _pedidos_pagos(*, vendedor, realizado_de, realizado_ate):
    pedidos = Pedido.objects_todos.filter(vendedor=vendedor, status=StatusPedido.PAGO)
    if realizado_de:
        pedidos = pedidos.filter(realizado_em__gte=realizado_de)
    if realizado_ate:
        pedidos = pedidos.filter(realizado_em__lte=realizado_ate)
    return pedidos


def _lancamentos_manuais(*, vendedor, realizado_de, realizado_ate):
    lancamentos = Lancamento.objects_todos.filter(vendedor=vendedor)
    if realizado_de:
        lancamentos = lancamentos.filter(data__gte=realizado_de)
    if realizado_ate:
        lancamentos = lancamentos.filter(data__lte=realizado_ate)
    return lancamentos
