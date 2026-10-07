from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.contas.tests.factories import SENHA_PADRAO, UsuarioFactory
from apps.financeiro.models import Lancamento, TipoLancamento
from apps.pedidos.models import Canal, ItemPedido, Pedido, StatusPedido


@pytest.fixture
def client():
    return APIClient()


def _autenticar(client, usuario):
    login = client.post(
        "/api/v1/auth/login",
        {"email": usuario.email, "password": SENHA_PADRAO},
        format="json",
    )
    return {"HTTP_AUTHORIZATION": f"Bearer {login.data['access']}"}


def _criar_pedido_pago(vendedor, *, valor, taxa=0, id_externo="500"):
    pedido = Pedido.objects_todos.create(
        vendedor=vendedor,
        canal=Canal.MERCADO_LIVRE,
        id_externo=id_externo,
        status=StatusPedido.PAGO,
        status_no_canal="paid",
        entregue=False,
        realizado_em=timezone.now(),
        valor_total=Decimal(str(valor)),
        valor_pago=Decimal(str(valor)),
        moeda="BRL",
        comprador_id_externo="555",
        comprador_apelido="CLIENTE_TESTE",
        sincronizado_em=timezone.now(),
    )
    ItemPedido.objects.create(
        pedido=pedido,
        id_externo=f"item-{id_externo}",
        titulo="Produto",
        quantidade=1,
        preco_unitario=Decimal(str(valor)),
        taxa_venda=Decimal(str(taxa)),
    )
    return pedido


def _criar_despesa(vendedor, *, valor, dias_antes=0):
    return Lancamento.objects_todos.create(
        vendedor=vendedor,
        tipo=TipoLancamento.DESPESA,
        descricao="Frete Correios",
        valor=Decimal(str(valor)),
        data=timezone.now() - timedelta(days=dias_antes),
    )


@pytest.mark.django_db
class TestResumoFinanceiro:
    def test_resumo_soma_receitas_e_taxas_dos_pedidos_e_despesas_manuais(self, client):
        usuario = UsuarioFactory()
        _criar_pedido_pago(usuario.vendedor, valor=100, taxa=5)
        _criar_despesa(usuario.vendedor, valor=20)

        resposta = client.get("/api/v1/financeiro/resumo", **_autenticar(client, usuario))

        assert resposta.status_code == 200
        assert resposta.data["receitas"] == 100
        assert resposta.data["taxas"] == 5
        assert resposta.data["despesas"] == 20
        assert resposta.data["margem_liquida"] == 75

    def test_resumo_ignora_pedidos_nao_pagos_e_outros_vendedores(self, client):
        usuario = UsuarioFactory()
        estranho = UsuarioFactory()
        _criar_pedido_pago(usuario.vendedor, valor=50, taxa=0)
        _criar_pedido_pago(estranho.vendedor, valor=999, taxa=0)
        _criar_despesa(estranho.vendedor, valor=500)

        resposta = client.get("/api/v1/financeiro/resumo", **_autenticar(client, usuario))

        assert resposta.data["receitas"] == 50
        assert resposta.data["despesas"] == 0

    def test_resumo_filtra_por_periodo(self, client):
        usuario = UsuarioFactory()
        pedido = _criar_pedido_pago(usuario.vendedor, valor=100, taxa=0)
        _criar_despesa(usuario.vendedor, valor=30, dias_antes=30)
        inicio = pedido.realizado_em - timedelta(days=1)
        fim = pedido.realizado_em + timedelta(days=1)

        resposta = client.get(
            "/api/v1/financeiro/resumo",
            {"realizado_de": inicio.isoformat(), "realizado_ate": fim.isoformat()},
            **_autenticar(client, usuario),
        )

        assert resposta.data["receitas"] == 100
        assert resposta.data["despesas"] == 0

    def test_resumo_sem_dados_retorna_zeros(self, client):
        resposta = client.get("/api/v1/financeiro/resumo", **_autenticar(client, UsuarioFactory()))

        assert resposta.status_code == 200
        assert resposta.data["receitas"] == 0
        assert resposta.data["despesas"] == 0
        assert resposta.data["taxas"] == 0
        assert resposta.data["margem_liquida"] == 0


@pytest.mark.django_db
class TestLancamentos:
    def test_cria_lancamento_manual(self, client):
        usuario = UsuarioFactory()

        resposta = client.post(
            "/api/v1/financeiro/lancamentos",
            {
                "tipo": "DESPESA",
                "descricao": "Compra de estoque",
                "valor": 2400,
                "canal": "SHOPEE",
            },
            format="json",
            **_autenticar(client, usuario),
        )

        assert resposta.status_code == 201
        assert resposta.data["descricao"] == "Compra de estoque"
        assert resposta.data["canal_nome"] == "Shopee"
        assert Lancamento.objects_todos.filter(vendedor=usuario.vendedor).count() == 1

    def test_lista_e_filtra_por_tipo(self, client):
        usuario = UsuarioFactory()
        _criar_despesa(usuario.vendedor, valor=30)
        Lancamento.objects_todos.create(
            vendedor=usuario.vendedor,
            tipo=TipoLancamento.TAXA,
            descricao="Taxa de intermediação",
            valor=Decimal("7.50"),
        )

        resposta = client.get(
            "/api/v1/financeiro/lancamentos", {"tipo": "TAXA"}, **_autenticar(client, usuario)
        )

        assert resposta.data["count"] == 1
        assert resposta.data["results"][0]["descricao"] == "Taxa de intermediação"

    def test_lancamento_de_outro_vendedor_nao_aparece(self, client):
        dono = UsuarioFactory()
        estranho = UsuarioFactory()
        _criar_despesa(dono.vendedor, valor=30)

        resposta = client.get(
            "/api/v1/financeiro/lancamentos", **_autenticar(client, estranho)
        )

        assert resposta.data["count"] == 0

    def test_rotas_exigem_autenticacao(self, client):
        assert client.get("/api/v1/financeiro/resumo").status_code == 401
        assert client.post(
            "/api/v1/financeiro/lancamentos", {}, format="json"
        ).status_code == 401
