import json
from datetime import timedelta
from decimal import Decimal
from io import StringIO
from unittest.mock import Mock, patch

import httpx
import openai
import pytest
from django.core.management import CommandError, call_command
from django.utils import timezone
from openai.types.chat import ChatCompletionMessage
from rest_framework.test import APIClient

from apps.assistente import consultas, ferramentas, provedor
from apps.assistente.models import Conversa, Mensagem
from apps.contas.models import Usuario
from apps.contas.tests.factories import SENHA_PADRAO, UsuarioFactory
from apps.pedidos.models import Canal, ItemPedido, Pedido, StatusPedido
from apps.produtos.models import Produto

CAMINHO_PROVEDOR = "apps.assistente.provedor.gerar_resposta"


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


def _pedido(
    vendedor,
    numero,
    *,
    valor="100.00",
    canal=Canal.MERCADO_LIVRE,
    status=StatusPedido.PAGO,
    dias_atras=1,
    itens=(("Fone", "FON-1", 1),),
):
    realizado_em = timezone.now() - timedelta(days=dias_atras)
    valor = Decimal(valor)
    pedido = Pedido.objects_todos.create(
        vendedor=vendedor,
        canal=canal,
        id_externo=str(numero),
        status=status,
        status_no_canal="paid",
        realizado_em=realizado_em,
        valor_total=valor,
        valor_pago=valor if status == StatusPedido.PAGO else Decimal("0"),
        moeda="BRL",
        comprador_apelido="COMPRADOR_SECRETO",
        sincronizado_em=timezone.now(),
    )
    for titulo, sku, quantidade in itens:
        ItemPedido.objects.create(
            pedido=pedido,
            id_externo=sku,
            titulo=titulo,
            sku=sku,
            quantidade=quantidade,
            preco_unitario=valor / quantidade,
            taxa_venda=Decimal("10.00"),
        )
    return pedido


def _mensagem_texto(texto):
    return provedor.RespostaDoModelo(
        mensagem=ChatCompletionMessage(role="assistant", content=texto), modelo="modelo-teste"
    )


def _mensagem_ferramenta(nome, argumentos=None, id_chamada="chamada-1"):
    mensagem = ChatCompletionMessage.model_validate(
        {
            "role": "assistant",
            "content": None,
            "tool_calls": [
                {
                    "id": id_chamada,
                    "type": "function",
                    "function": {"name": nome, "arguments": json.dumps(argumentos or {})},
                }
            ],
        }
    )
    return provedor.RespostaDoModelo(mensagem=mensagem, modelo="modelo-teste")


@pytest.mark.django_db
class TestConsultas:
    def test_resumo_de_vendas_considera_so_o_vendedor_e_pedidos_pagos(self):
        dono = UsuarioFactory().vendedor
        outro = UsuarioFactory().vendedor
        _pedido(dono, 1, valor="100.00")
        _pedido(dono, 2, valor="50.00")
        _pedido(dono, 3, valor="999.00", status=StatusPedido.CANCELADO)
        _pedido(outro, 4, valor="5000.00")

        resumo = consultas.resumo_vendas(vendedor=dono)

        assert resumo["receita"] == 150.0
        assert resumo["pedidos_pagos"] == 2
        assert resumo["pedidos_cancelados"] == 1
        assert resumo["ticket_medio"] == 75.0

    def test_periodo_filtra_por_data(self):
        vendedor = UsuarioFactory().vendedor
        _pedido(vendedor, 1, valor="100.00", dias_atras=2)
        _pedido(vendedor, 2, valor="300.00", dias_atras=60)
        hoje = timezone.localdate()

        recente = consultas.resumo_vendas(
            vendedor=vendedor, de=(hoje - timedelta(days=7)).isoformat(), ate=hoje.isoformat()
        )

        assert recente["receita"] == 100.0

    def test_vendas_por_canal_calcula_participacao(self):
        vendedor = UsuarioFactory().vendedor
        _pedido(vendedor, 1, valor="300.00", canal=Canal.MERCADO_LIVRE)
        _pedido(vendedor, 2, valor="100.00", canal=Canal.SHOPEE)

        resultado = consultas.vendas_por_canal(vendedor=vendedor)

        assert resultado["receita_total"] == 400.0
        assert resultado["canais"][0]["canal"] == "Mercado Livre"
        assert resultado["canais"][0]["participacao_percentual"] == 75.0

    def test_produtos_mais_vendidos_ordena_por_quantidade(self):
        vendedor = UsuarioFactory().vendedor
        _pedido(vendedor, 1, itens=(("Fone", "FON-1", 1),))
        _pedido(vendedor, 2, itens=(("Cabo", "CAB-1", 3),))

        ranking = consultas.produtos_mais_vendidos(vendedor=vendedor)

        assert [produto["produto"] for produto in ranking["produtos"]] == ["Cabo", "Fone"]
        assert ranking["produtos"][0]["unidades_vendidas"] == 3

    def test_vendas_por_periodo_agrupa_por_mes(self):
        vendedor = UsuarioFactory().vendedor
        _pedido(vendedor, 1, valor="100.00", dias_atras=1)
        _pedido(vendedor, 2, valor="100.00", dias_atras=1)

        serie = consultas.vendas_por_periodo(vendedor=vendedor, agrupamento="mes")

        assert sum(ponto["receita"] for ponto in serie["serie"]) == 200.0

    def test_listar_pedidos_nao_expoe_o_comprador(self):
        vendedor = UsuarioFactory().vendedor
        _pedido(vendedor, 1)

        resultado = consultas.listar_pedidos(vendedor=vendedor)

        assert resultado["total_encontrado"] == 1
        assert "COMPRADOR_SECRETO" not in json.dumps(resultado)

    def test_produtos_com_estoque_baixo(self):
        vendedor = UsuarioFactory().vendedor
        Produto.objects_todos.create(vendedor=vendedor, nome="Acabando", sku="A", estoque=2)
        Produto.objects_todos.create(vendedor=vendedor, nome="Sobrando", sku="S", estoque=50)

        resultado = consultas.produtos_estoque_baixo(vendedor=vendedor)

        assert [produto["produto"] for produto in resultado["produtos"]] == ["Acabando"]

    def test_data_invalida_e_periodo_invertido_sao_rejeitados(self):
        vendedor = UsuarioFactory().vendedor

        with pytest.raises(consultas.ParametroInvalido):
            consultas.resumo_vendas(vendedor=vendedor, de="ontem")
        with pytest.raises(consultas.ParametroInvalido):
            consultas.resumo_vendas(vendedor=vendedor, de="2026-10-31", ate="2026-10-01")


@pytest.mark.django_db
class TestFerramentas:
    def test_executa_a_consulta_com_o_vendedor_do_backend(self):
        dono = UsuarioFactory().vendedor
        outro = UsuarioFactory().vendedor
        _pedido(outro, 1, valor="5000.00")

        # mesmo que a IA tente escolher outro vendedor, o parâmetro é descartado
        resultado = json.loads(
            ferramentas.executar(
                nome="resumo_vendas",
                argumentos_json=json.dumps({"vendedor": str(outro.id)}),
                vendedor=dono,
            )
        )

        assert resultado["receita"] == 0.0

    @pytest.mark.parametrize(
        ("nome", "argumentos"),
        [
            ("apagar_tudo", "{}"),
            ("resumo_vendas", "isto não é json"),
            ("resumo_vendas", '{"de": "ontem"}'),
            ("vendas_por_periodo", '{"agrupamento": "ano"}'),
        ],
    )
    def test_pedidos_invalidos_da_ia_viram_erro_para_ela(self, nome, argumentos):
        vendedor = UsuarioFactory().vendedor

        resultado = json.loads(
            ferramentas.executar(nome=nome, argumentos_json=argumentos, vendedor=vendedor)
        )

        assert "erro" in resultado


@pytest.mark.django_db
class TestRotasDoAssistente:
    def test_pergunta_com_ferramenta_responde_e_salva_a_conversa(self, client):
        usuario = UsuarioFactory()
        _pedido(usuario.vendedor, 1, valor="150.00")
        respostas = [
            _mensagem_ferramenta("resumo_vendas"),
            _mensagem_texto("Você vendeu R$ 150,00."),
        ]

        with patch(CAMINHO_PROVEDOR, side_effect=respostas) as gerar:
            resposta = client.post(
                "/api/v1/assistente/mensagens",
                {"mensagem": "Quanto vendi?"},
                format="json",
                **_autenticar(client, usuario),
            )

        assert resposta.status_code == 201
        assert resposta.data["mensagem"]["conteudo"] == "Você vendeu R$ 150,00."
        assert resposta.data["limite_diario"]["usadas"] == 1
        conversa = Conversa.objects_todos.get(usuario=usuario)
        assert conversa.titulo == "Quanto vendi?"
        assert list(conversa.mensagens.values_list("papel", flat=True)) == [
            "USUARIO",
            "ASSISTENTE",
        ]
        # o resultado da consulta (do vendedor certo) foi devolvido à IA
        segunda_chamada = gerar.call_args_list[1].kwargs
        resultado_ferramenta = json.loads(segunda_chamada["mensagens"][-1]["content"])
        assert resultado_ferramenta["receita"] == 150.0
        assert segunda_chamada["modelo"] == "modelo-teste"

    def test_continua_conversa_enviando_o_historico(self, client):
        usuario = UsuarioFactory()
        cabecalhos = _autenticar(client, usuario)
        with patch(CAMINHO_PROVEDOR, return_value=_mensagem_texto("Primeira resposta")):
            primeira = client.post(
                "/api/v1/assistente/mensagens", {"mensagem": "Oi"}, format="json", **cabecalhos
            )

        with patch(CAMINHO_PROVEDOR, return_value=_mensagem_texto("Segunda")) as gerar:
            segunda = client.post(
                "/api/v1/assistente/mensagens",
                {"mensagem": "E agora?", "conversa_id": primeira.data["conversa"]["id"]},
                format="json",
                **cabecalhos,
            )

        assert segunda.status_code == 201
        enviadas = gerar.call_args.kwargs["mensagens"]
        assert [m["content"] for m in enviadas[1:]] == ["Oi", "Primeira resposta", "E agora?"]
        assert Mensagem.objects.filter(conversa_id=primeira.data["conversa"]["id"]).count() == 4

    def test_conversa_de_outro_usuario_e_404(self, client):
        dono = UsuarioFactory()
        estranho = UsuarioFactory()
        conversa = Conversa.objects_todos.create(
            vendedor=dono.vendedor, usuario=dono, titulo="Privada"
        )
        cabecalhos = _autenticar(client, estranho)

        detalhe = client.get(f"/api/v1/assistente/conversas/{conversa.id}", **cabecalhos)
        with patch(CAMINHO_PROVEDOR) as gerar:
            envio = client.post(
                "/api/v1/assistente/mensagens",
                {"mensagem": "Oi", "conversa_id": str(conversa.id)},
                format="json",
                **cabecalhos,
            )

        assert detalhe.status_code == 404
        assert envio.status_code == 404
        gerar.assert_not_called()

    def test_lista_e_exclui_somente_as_proprias_conversas(self, client):
        usuario = UsuarioFactory()
        outro = UsuarioFactory()
        minha = Conversa.objects_todos.create(
            vendedor=usuario.vendedor, usuario=usuario, titulo="Minha"
        )
        Conversa.objects_todos.create(vendedor=outro.vendedor, usuario=outro, titulo="Dele")
        cabecalhos = _autenticar(client, usuario)

        lista = client.get("/api/v1/assistente/conversas", **cabecalhos)
        exclusao = client.delete(f"/api/v1/assistente/conversas/{minha.id}", **cabecalhos)

        assert [c["titulo"] for c in lista.data["results"]] == ["Minha"]
        assert exclusao.status_code == 204
        assert not Conversa.objects_todos.filter(id=minha.id).exists()

    def test_limite_diario_bloqueia_novas_perguntas(self, client, settings):
        settings.ASSISTENTE_LIMITE_DIARIO = 1
        usuario = UsuarioFactory()
        cabecalhos = _autenticar(client, usuario)
        with patch(CAMINHO_PROVEDOR, return_value=_mensagem_texto("Ok")):
            client.post(
                "/api/v1/assistente/mensagens", {"mensagem": "1"}, format="json", **cabecalhos
            )

        with patch(CAMINHO_PROVEDOR) as gerar:
            resposta = client.post(
                "/api/v1/assistente/mensagens", {"mensagem": "2"}, format="json", **cabecalhos
            )
        limite = client.get("/api/v1/assistente/limite", **cabecalhos)

        assert resposta.status_code == 429
        assert resposta.data["codigo"] == "assistente_limite_diario"
        gerar.assert_not_called()
        assert limite.data == {"limite": 1, "usadas": 1, "restantes": 0}

    def test_falha_do_provedor_retorna_503_e_nao_consome_o_limite(self, client):
        usuario = UsuarioFactory()
        falha = provedor.AssistenteIndisponivel(mensagem="Ocupado")

        with patch(CAMINHO_PROVEDOR, side_effect=falha):
            resposta = client.post(
                "/api/v1/assistente/mensagens",
                {"mensagem": "Quanto vendi?"},
                format="json",
                **_autenticar(client, usuario),
            )

        assert resposta.status_code == 503
        assert resposta.data["codigo"] == "assistente_indisponivel"
        assert not Conversa.objects_todos.filter(usuario=usuario).exists()

    def test_sem_chave_configurada_retorna_503_tratado(self, client):
        usuario = UsuarioFactory()

        resposta = client.post(
            "/api/v1/assistente/mensagens",
            {"mensagem": "Quanto vendi?"},
            format="json",
            **_autenticar(client, usuario),
        )

        assert resposta.status_code == 503
        assert resposta.data["codigo"] == "assistente_nao_configurado"

    def test_mensagem_vazia_e_rejeitada(self, client):
        usuario = UsuarioFactory()

        resposta = client.post(
            "/api/v1/assistente/mensagens",
            {"mensagem": "   "},
            format="json",
            **_autenticar(client, usuario),
        )

        assert resposta.status_code == 400

    def test_rotas_exigem_autenticacao(self, client):
        assert client.post("/api/v1/assistente/mensagens", {}, format="json").status_code == 401
        assert client.get("/api/v1/assistente/conversas").status_code == 401
        assert client.get("/api/v1/assistente/limite").status_code == 401


@pytest.mark.django_db
class TestSeedAssistente:
    def test_cria_dados_sem_duplicar_e_recria_com_a_opcao(self, settings):
        settings.DEBUG = True
        call_command("seed_demo", stdout=StringIO())

        call_command("seed_assistente", stdout=StringIO())
        call_command("seed_assistente", stdout=StringIO())  # segunda vez não duplica

        vendedor = Usuario.objects.get(email="demo1@hubmulticanal.com.br").vendedor
        assert Produto.objects_todos.filter(vendedor=vendedor).count() == 20
        assert Pedido.objects_todos.filter(vendedor=vendedor).count() == 150
        assert ItemPedido.objects.filter(pedido__vendedor=vendedor).count() >= 150
        resumo = consultas.resumo_vendas(vendedor=vendedor, de="2000-01-01")
        assert resumo["receita"] > 0
        assert consultas.produtos_estoque_baixo(vendedor=vendedor)["total_encontrado"] > 0

        call_command("seed_assistente", "--recriar", stdout=StringIO())

        assert Pedido.objects_todos.filter(vendedor=vendedor).count() == 150
        assert Produto.objects_todos.filter(vendedor=vendedor).count() == 20

    def test_recusa_rodar_sem_debug(self, settings):
        settings.DEBUG = False

        with pytest.raises(CommandError):
            call_command("seed_assistente", stdout=StringIO())


def _erro_http(classe, status):
    resposta = httpx.Response(status, request=httpx.Request("POST", "https://ia.teste"))
    return classe("erro simulado", response=resposta, body=None)


class TestProvedor:
    def _cliente_falso(self, efeitos):
        cliente = Mock()
        cliente.chat.completions.create.side_effect = efeitos
        return cliente

    def test_tenta_o_proximo_modelo_quando_um_esta_sem_cota(self, settings):
        settings.LLM_API_KEY = "chave-teste"
        settings.LLM_MODELOS = ["modelo-a", "modelo-b"]
        sucesso = Mock(choices=[Mock(message="mensagem")])
        cliente = self._cliente_falso([_erro_http(openai.RateLimitError, 429), sucesso])

        with patch("apps.assistente.provedor.openai.OpenAI", return_value=cliente):
            resposta = provedor.gerar_resposta(mensagens=[], ferramentas=[])

        assert resposta.modelo == "modelo-b"
        modelos = [c.kwargs["model"] for c in cliente.chat.completions.create.call_args_list]
        assert modelos == ["modelo-a", "modelo-b"]

    def test_todos_sem_cota_vira_erro_tratado(self, settings):
        settings.LLM_API_KEY = "chave-teste"
        settings.LLM_MODELOS = ["modelo-a", "modelo-b"]
        cliente = self._cliente_falso([_erro_http(openai.RateLimitError, 429)] * 2)

        with patch("apps.assistente.provedor.openai.OpenAI", return_value=cliente):
            with pytest.raises(provedor.AssistenteIndisponivel) as erro:
                provedor.gerar_resposta(mensagens=[], ferramentas=[])

        assert erro.value.codigo == "assistente_sem_cota"

    def test_chave_recusada_nao_tenta_outros_modelos(self, settings):
        settings.LLM_API_KEY = "chave-errada"
        settings.LLM_MODELOS = ["modelo-a", "modelo-b"]
        cliente = self._cliente_falso([_erro_http(openai.AuthenticationError, 401)])

        with patch("apps.assistente.provedor.openai.OpenAI", return_value=cliente):
            with pytest.raises(provedor.AssistenteIndisponivel) as erro:
                provedor.gerar_resposta(mensagens=[], ferramentas=[])

        assert erro.value.codigo == "assistente_nao_configurado"
        assert cliente.chat.completions.create.call_count == 1
