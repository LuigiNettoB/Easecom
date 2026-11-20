import random
from datetime import datetime, time, timedelta
from decimal import Decimal

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.contas.models import Usuario
from apps.core.management.commands.seed_demo import VENDEDORES_DEMO
from apps.financeiro.models import Lancamento, TipoLancamento
from apps.pedidos.models import Canal, ItemPedido, Pedido, StatusPedido
from apps.produtos.models import Produto, ProdutoCanal

PREFIXO = "DEMO-"
MARCADOR_LANCAMENTO = "[demo]"
DIAS_DE_HISTORICO = 180
PEDIDOS_POR_LOJA = 150

# (nome, categoria, preço, estoque) — alguns propositalmente com estoque baixo
CATALOGO = [
    ("Fone Bluetooth TWS", "Eletrônicos", "129.90", 42),
    ("Carregador Turbo USB-C 25W", "Eletrônicos", "59.90", 8),
    ("Smartwatch Fit Pro", "Eletrônicos", "249.90", 15),
    ("Caixa de Som Portátil", "Eletrônicos", "179.90", 4),
    ("Cabo USB-C Reforçado 2m", "Acessórios", "29.90", 120),
    ("Capinha Antichoque", "Acessórios", "24.90", 85),
    ("Película de Vidro 3D", "Acessórios", "19.90", 6),
    ("Suporte Veicular Magnético", "Acessórios", "39.90", 33),
    ("Garrafa Térmica 1L", "Casa", "89.90", 27),
    ("Kit Potes Herméticos 5 peças", "Casa", "69.90", 2),
    ("Luminária LED de Mesa", "Casa", "99.90", 18),
    ("Organizador de Gaveta", "Casa", "34.90", 50),
    ("Camiseta Dry Fit", "Moda", "49.90", 64),
    ("Boné Aba Curva", "Moda", "39.90", 9),
    ("Mochila Notebook 15,6", "Moda", "159.90", 21),
    ("Tênis Casual Unissex", "Moda", "199.90", 12),
    ("Tapete de Yoga", "Esporte", "79.90", 16),
    ("Kit Elásticos de Treino", "Esporte", "54.90", 7),
    ("Squeeze 750ml", "Esporte", "29.90", 95),
    ("Corda de Pular Profissional", "Esporte", "44.90", 3),
]

PESO_POR_CANAL = {
    Canal.MERCADO_LIVRE: 45,
    Canal.SHOPEE: 30,
    Canal.AMAZON: 15,
    Canal.MAGALU: 10,
}
TAXA_POR_CANAL = {
    Canal.MERCADO_LIVRE: Decimal("0.14"),
    Canal.SHOPEE: Decimal("0.12"),
    Canal.AMAZON: Decimal("0.15"),
    Canal.MAGALU: Decimal("0.13"),
}
STATUS_NO_CANAL = {
    StatusPedido.PAGO: "paid",
    StatusPedido.CANCELADO: "cancelled",
    StatusPedido.PENDENTE: "payment_required",
}
DESPESAS_MENSAIS = [
    ("Frete e envios", "", 300, 650),
    ("Embalagens", "", 90, 240),
    ("Anúncios patrocinados", Canal.MERCADO_LIVRE, 150, 450),
    ("Anúncios patrocinados", Canal.SHOPEE, 80, 260),
]


class Command(BaseCommand):
    help = (
        "Cria dados de demonstração (produtos, ~150 pedidos dos últimos 6 meses e "
        "despesas) para as lojas do seed_demo, para testar o assistente de vendas. "
        "Idempotente; use --recriar para apagar e gerar de novo. Exige DEBUG=True."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--recriar",
            action="store_true",
            help="Apaga os dados de demonstração existentes e gera novamente.",
        )

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("seed_assistente só pode ser executado com DEBUG=True.")

        for indice, dados in enumerate(VENDEDORES_DEMO):
            usuario = (
                Usuario.objects.filter(email=dados["email"]).select_related("vendedor").first()
            )
            if usuario is None or usuario.vendedor is None:
                raise CommandError(
                    f"{dados['email']} não existe. Rode antes: python manage.py seed_demo"
                )
            self._popular(usuario.vendedor, indice, recriar=options["recriar"])

    def _popular(self, vendedor, indice, *, recriar):
        existentes = Produto.objects_todos.filter(vendedor=vendedor, sku__startswith=PREFIXO)
        if existentes.exists() and not recriar:
            self.stdout.write(f"{vendedor.nome}: já tem dados de demonstração — nada a fazer.")
            return

        sorteio = random.Random(1000 + indice)
        with transaction.atomic():
            if recriar:
                self._apagar(vendedor)
            produtos = self._criar_produtos(vendedor, sorteio, fator_preco=1 + indice * 0.15)
            total_pedidos = self._criar_pedidos(vendedor, produtos, sorteio)
            total_despesas = self._criar_despesas(vendedor, sorteio)

        self.stdout.write(
            self.style.SUCCESS(
                f"{vendedor.nome}: {len(produtos)} produtos, {total_pedidos} pedidos e "
                f"{total_despesas} despesas de demonstração criados."
            )
        )

    @staticmethod
    def _apagar(vendedor):
        Pedido.objects_todos.filter(vendedor=vendedor, id_externo__startswith=PREFIXO).delete()
        Produto.objects_todos.filter(vendedor=vendedor, sku__startswith=PREFIXO).delete()
        Lancamento.objects_todos.filter(
            vendedor=vendedor, descricao__startswith=MARCADOR_LANCAMENTO
        ).delete()

    @staticmethod
    def _criar_produtos(vendedor, sorteio, *, fator_preco):
        # gravação em lote: o banco é remoto, uma ida por registro deixaria o comando lento
        produtos = Produto.objects_todos.bulk_create(
            Produto(
                vendedor=vendedor,
                nome=nome,
                sku=f"{PREFIXO}{numero:03d}",
                categoria=categoria,
                preco=(Decimal(preco) * Decimal(str(fator_preco))).quantize(Decimal("0.01")),
                estoque=estoque,
            )
            for numero, (nome, categoria, preco, estoque) in enumerate(CATALOGO, start=1)
        )
        ProdutoCanal.objects.bulk_create(
            ProdutoCanal(produto=produto, canal=canal)
            for produto in produtos
            for canal in sorteio.sample(list(PESO_POR_CANAL), k=sorteio.randint(1, 3))
        )
        return produtos

    @staticmethod
    def _criar_pedidos(vendedor, produtos, sorteio):
        agora = timezone.now()
        fuso = timezone.get_current_timezone()
        hoje = timezone.localdate()
        canais = list(PESO_POR_CANAL)
        pesos = list(PESO_POR_CANAL.values())
        # produtos do começo da lista vendem mais, para o ranking ficar interessante
        pesos_produtos = [len(produtos) - posicao for posicao in range(len(produtos))]
        pedidos, todos_os_itens = [], []

        for numero in range(1, PEDIDOS_POR_LOJA + 1):
            # mais pedidos nos meses recentes: simula uma loja em crescimento
            dias_atras = int(DIAS_DE_HISTORICO * (sorteio.random() ** 1.6))
            dia = hoje - timedelta(days=dias_atras)
            horario = time(hour=sorteio.randint(8, 22), minute=sorteio.randint(0, 59))
            realizado_em = timezone.make_aware(datetime.combine(dia, horario), fuso)
            if realizado_em > agora:
                realizado_em = agora - timedelta(minutes=sorteio.randint(5, 300))

            canal = sorteio.choices(canais, weights=pesos)[0]
            chance = sorteio.random()
            if dias_atras <= 3 and chance < 0.25:
                status = StatusPedido.PENDENTE
            elif chance > 0.9:
                status = StatusPedido.CANCELADO
            else:
                status = StatusPedido.PAGO

            escolhidos = set()
            while len(escolhidos) < sorteio.choices([1, 2, 3], weights=[70, 22, 8])[0]:
                escolhidos.add(sorteio.choices(range(len(produtos)), weights=pesos_produtos)[0])

            itens = []
            for posicao in escolhidos:
                produto = produtos[posicao]
                quantidade = sorteio.choices([1, 2, 3], weights=[75, 18, 7])[0]
                subtotal = produto.preco * quantidade
                itens.append(
                    ItemPedido(
                        id_externo=f"{PREFIXO}{produto.sku}",
                        titulo=produto.nome,
                        sku=produto.sku,
                        quantidade=quantidade,
                        preco_unitario=produto.preco,
                        taxa_venda=(subtotal * TAXA_POR_CANAL[canal]).quantize(Decimal("0.01")),
                    )
                )
            valor_total = sum(item.preco_unitario * item.quantidade for item in itens)

            pedido = Pedido(
                vendedor=vendedor,
                canal=canal,
                id_externo=f"{PREFIXO}{numero:05d}",
                status=status,
                status_no_canal=STATUS_NO_CANAL[status],
                entregue=status == StatusPedido.PAGO and dias_atras > 7,
                realizado_em=realizado_em,
                valor_total=valor_total,
                valor_pago=valor_total if status == StatusPedido.PAGO else Decimal("0"),
                moeda="BRL",
                sincronizado_em=agora,
            )
            for item in itens:
                item.pedido = pedido  # o id (UUID) já existe antes de gravar
            pedidos.append(pedido)
            todos_os_itens.extend(itens)

        Pedido.objects_todos.bulk_create(pedidos)
        ItemPedido.objects.bulk_create(todos_os_itens)
        return len(pedidos)

    @staticmethod
    def _criar_despesas(vendedor, sorteio):
        fuso = timezone.get_current_timezone()
        hoje = timezone.localdate()
        lancamentos = []
        for meses_atras in range(DIAS_DE_HISTORICO // 30):
            ano, mes = hoje.year, hoje.month - meses_atras
            while mes <= 0:
                ano, mes = ano - 1, mes + 12
            data = timezone.make_aware(datetime(ano, mes, 5, 10, 0), fuso)
            if data > timezone.now():
                continue
            for descricao, canal, minimo, maximo in DESPESAS_MENSAIS:
                lancamentos.append(
                    Lancamento(
                        vendedor=vendedor,
                        tipo=TipoLancamento.DESPESA,
                        descricao=f"{MARCADOR_LANCAMENTO} {descricao}",
                        canal=canal,
                        valor=Decimal(sorteio.randint(minimo * 100, maximo * 100)) / 100,
                        data=data,
                    )
                )
        Lancamento.objects_todos.bulk_create(lancamentos)
        return len(lancamentos)
