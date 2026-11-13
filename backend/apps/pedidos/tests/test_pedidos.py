from datetime import timedelta
from decimal import Decimal
from unittest.mock import Mock, patch

import pytest
import requests
from django.utils import timezone
from rest_framework.test import APIClient

from apps.canais.models import MercadoLivreToken
from apps.contas.tests.factories import SENHA_PADRAO, UsuarioFactory, VendedorFactory
from apps.core.exceptions import ErroDeNegocio
from apps.pedidos.adaptadores import mercado_livre
from apps.pedidos.models import Canal, Pedido, StatusPedido
from apps.pedidos.services import sincronizar_pedidos


def _pedido_ml(id_pedido, *, status="paid", valor=99.8, tags=("paid", "not_delivered")):
    return {
        "id": id_pedido,
        "status": status,
        "date_created": "2026-09-09T14:11:17.000-04:00",
        "total_amount": valor,
        "paid_amount": valor if status == "paid" else 0,
        "currency_id": "BRL",
        "buyer": {"id": 555, "nickname": "COMPRADOR_TESTE"},
        "order_items": [
            {
                "item": {"id": "MLB1", "title": "Mousepad Gamer", "seller_sku": "MP-1"},
                "quantity": 2,
                "unit_price": valor / 2,
                "sale_fee": 6.49,
            }
        ],
        "tags": list(tags),
    }


def _resposta_ml(pedidos, total=None):
    resposta = Mock()
    resposta.json.return_value = {
        "results": pedidos,
        "paging": {"total": len(pedidos) if total is None else total},
    }
    return resposta


def _conectar_mercado_livre(vendedor, ml_user_id=123456789):
    return MercadoLivreToken.objects_todos.create(
        vendedor=vendedor,
        ml_user_id=ml_user_id,
        access_token="token",
        refresh_token="refresh",
        expires_at=timezone.now() + timedelta(hours=6),
    )


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


CAMINHO_CHAMADA_ML = "apps.pedidos.adaptadores.mercado_livre.chamar_api_mercado_livre"


@pytest.mark.django_db
class TestAdaptadorMercadoLivre:
    def test_traduz_pedido_para_o_formato_do_hub(self):
        vendedor = VendedorFactory()
        _conectar_mercado_livre(vendedor)

        with patch(CAMINHO_CHAMADA_ML, return_value=_resposta_ml([_pedido_ml(2000)])) as chamada:
            pedidos = list(mercado_livre.buscar_pedidos(vendedor=vendedor))

        assert chamada.call_args.kwargs["params"]["seller"] == 123456789
        pedido = pedidos[0]
        assert pedido.id_externo == "2000"
        assert pedido.status == StatusPedido.PAGO
        assert pedido.status_no_canal == "paid"
        assert pedido.entregue is False
        assert pedido.valor_total == Decimal("99.8")
        assert pedido.comprador_apelido == "COMPRADOR_TESTE"
        assert pedido.itens[0].sku == "MP-1"
        assert pedido.itens[0].quantidade == 2

    def test_status_desconhecido_vira_outro(self):
        pedido = mercado_livre._traduzir_pedido(_pedido_ml(1, status="status_novo_do_ml"))

        assert pedido.status == StatusPedido.OUTRO
        assert pedido.status_no_canal == "status_novo_do_ml"

    def test_percorre_todas_as_paginas(self):
        vendedor = VendedorFactory()
        _conectar_mercado_livre(vendedor)
        paginas = [
            _resposta_ml([_pedido_ml(n) for n in range(50)], total=51),
            _resposta_ml([_pedido_ml(50)], total=51),
        ]

        with patch(CAMINHO_CHAMADA_ML, side_effect=paginas) as chamada:
            pedidos = list(mercado_livre.buscar_pedidos(vendedor=vendedor))

        assert len(pedidos) == 51
        assert [c.kwargs["params"]["offset"] for c in chamada.call_args_list] == [0, 50]

    def test_falha_do_mercado_livre_vira_erro_de_negocio(self):
        vendedor = VendedorFactory()
        _conectar_mercado_livre(vendedor)

        with patch(CAMINHO_CHAMADA_ML, side_effect=requests.ConnectionError()):
            with pytest.raises(ErroDeNegocio) as excecao:
                list(mercado_livre.buscar_pedidos(vendedor=vendedor))

        assert excecao.value.codigo == "ml_indisponivel"


@pytest.mark.django_db
class TestSincronizarPedidos:
    def test_grava_pedidos_e_itens(self):
        vendedor = VendedorFactory()
        _conectar_mercado_livre(vendedor)

        with patch(CAMINHO_CHAMADA_ML, return_value=_resposta_ml([_pedido_ml(1), _pedido_ml(2)])):
            resultado = sincronizar_pedidos(vendedor=vendedor)

        assert resultado == [{"canal": Canal.MERCADO_LIVRE, "criados": 2, "atualizados": 0}]
        pedido = Pedido.objects_todos.get(vendedor=vendedor, id_externo="1")
        assert pedido.canal == Canal.MERCADO_LIVRE
        assert pedido.valor_pago == Decimal("99.80")
        assert pedido.itens.get().titulo == "Mousepad Gamer"

    def test_sincronizar_de_novo_atualiza_sem_duplicar(self):
        vendedor = VendedorFactory()
        _conectar_mercado_livre(vendedor)

        with patch(CAMINHO_CHAMADA_ML, return_value=_resposta_ml([_pedido_ml(1)])):
            sincronizar_pedidos(vendedor=vendedor)
        cancelado = _pedido_ml(1, status="cancelled")
        with patch(CAMINHO_CHAMADA_ML, return_value=_resposta_ml([cancelado])):
            resultado = sincronizar_pedidos(vendedor=vendedor)

        assert resultado == [{"canal": Canal.MERCADO_LIVRE, "criados": 0, "atualizados": 1}]
        pedido = Pedido.objects_todos.get(vendedor=vendedor)
        assert pedido.status == StatusPedido.CANCELADO
        assert pedido.itens.count() == 1

    def test_sem_canal_conectado_levanta_erro(self):
        with pytest.raises(ErroDeNegocio) as excecao:
            sincronizar_pedidos(vendedor=VendedorFactory())

        assert excecao.value.codigo == "nenhum_canal_conectado"


@pytest.mark.django_db
class TestRotasDePedidos:
    def _sincronizar(self, vendedor, pedidos, ml_user_id=123456789):
        _conectar_mercado_livre(vendedor, ml_user_id=ml_user_id)
        with patch(CAMINHO_CHAMADA_ML, return_value=_resposta_ml(pedidos)):
            sincronizar_pedidos(vendedor=vendedor)

    def test_sincronizar_pela_rota_retorna_contagem_por_canal(self, client):
        usuario = UsuarioFactory()
        _conectar_mercado_livre(usuario.vendedor)

        with patch(CAMINHO_CHAMADA_ML, return_value=_resposta_ml([_pedido_ml(1)])):
            resposta = client.post("/api/v1/pedidos/sincronizar", **_autenticar(client, usuario))

        assert resposta.status_code == 200
        assert resposta.data["canais"] == [
            {"canal": "MERCADO_LIVRE", "criados": 1, "atualizados": 0}
        ]

    def test_sincronizar_sem_canal_conectado_retorna_409(self, client):
        resposta = client.post(
            "/api/v1/pedidos/sincronizar", **_autenticar(client, UsuarioFactory())
        )

        assert resposta.status_code == 409
        assert resposta.data["codigo"] == "nenhum_canal_conectado"

    def test_lista_pedidos_do_vendedor_com_itens(self, client):
        usuario = UsuarioFactory()
        self._sincronizar(usuario.vendedor, [_pedido_ml(1), _pedido_ml(2, status="cancelled")])

        resposta = client.get("/api/v1/pedidos", **_autenticar(client, usuario))

        assert resposta.status_code == 200
        assert resposta.data["count"] == 2
        pedido = resposta.json()["results"][0]
        assert pedido["canal_nome"] == "Mercado Livre"
        assert pedido["valor_total"] == 99.8
        assert pedido["itens"][0]["titulo"] == "Mousepad Gamer"

    def test_lista_filtra_por_status(self, client):
        usuario = UsuarioFactory()
        self._sincronizar(usuario.vendedor, [_pedido_ml(1), _pedido_ml(2, status="cancelled")])

        resposta = client.get(
            "/api/v1/pedidos", {"status": "CANCELADO"}, **_autenticar(client, usuario)
        )

        assert [p["id_externo"] for p in resposta.data["results"]] == ["2"]

    def test_pedidos_de_outro_vendedor_nao_aparecem(self, client):
        dono = UsuarioFactory()
        estranho = UsuarioFactory()
        self._sincronizar(dono.vendedor, [_pedido_ml(1)])
        pedido = Pedido.objects_todos.get(vendedor=dono.vendedor)
        cabecalhos = _autenticar(client, estranho)

        lista = client.get("/api/v1/pedidos", **cabecalhos)
        detalhe = client.get(f"/api/v1/pedidos/{pedido.id}", **cabecalhos)

        assert lista.data["count"] == 0
        assert detalhe.status_code == 404
        assert detalhe.data["codigo"] == "recurso_nao_encontrado"

    def test_detalhe_retorna_pedido_do_proprio_vendedor(self, client):
        usuario = UsuarioFactory()
        self._sincronizar(usuario.vendedor, [_pedido_ml(1)])
        pedido = Pedido.objects_todos.get(vendedor=usuario.vendedor)

        resposta = client.get(f"/api/v1/pedidos/{pedido.id}", **_autenticar(client, usuario))

        assert resposta.status_code == 200
        assert resposta.data["id_externo"] == "1"

    def test_resumo_soma_apenas_pedidos_pagos(self, client):
        usuario = UsuarioFactory()
        self._sincronizar(
            usuario.vendedor,
            [_pedido_ml(1, valor=100), _pedido_ml(2, valor=50), _pedido_ml(3, status="cancelled")],
        )

        resposta = client.get("/api/v1/vendas/resumo", **_autenticar(client, usuario))

        assert resposta.status_code == 200
        assert resposta.data["total_pedidos"] == 3
        assert resposta.data["receita_total"] == 150
        assert resposta.data["pedidos_por_status"] == {"CANCELADO": 1, "PAGO": 2}
        assert resposta.data["por_canal"] == [
            {
                "canal": "MERCADO_LIVRE",
                "canal_nome": "Mercado Livre",
                "total_pedidos": 3,
                "receita_total": 150,
            }
        ]
        assert resposta.data["produtos_mais_vendidos"][0]["quantidade"] == 4
        assert resposta.data["ultima_sincronizacao"] is not None

    def test_resumo_sem_pedidos_retorna_zeros(self, client):
        resposta = client.get("/api/v1/vendas/resumo", **_autenticar(client, UsuarioFactory()))

        assert resposta.status_code == 200
        assert resposta.data["total_pedidos"] == 0
        assert resposta.data["receita_total"] == 0
        assert resposta.data["ultima_sincronizacao"] is None

    def test_rotas_exigem_autenticacao(self, client):
        assert client.get("/api/v1/pedidos").status_code == 401
        assert client.post("/api/v1/pedidos/sincronizar").status_code == 401
        assert client.get("/api/v1/vendas/resumo").status_code == 401
