from django.core.management.base import BaseCommand

from apps.contas.models import Vendedor
from apps.core.exceptions import ErroDeNegocio
from apps.pedidos.services import sincronizar_pedidos


class Command(BaseCommand):
    help = (
        "Busca os pedidos nos canais conectados e atualiza a cópia do hub. "
        "Sem --vendedor, sincroniza todos os vendedores."
    )

    def add_arguments(self, parser):
        parser.add_argument("--vendedor", help="Nome exato do vendedor a sincronizar.")

    def handle(self, *args, **options):
        vendedores = Vendedor.objects.all()
        if options["vendedor"]:
            vendedores = vendedores.filter(nome=options["vendedor"])

        for vendedor in vendedores:
            try:
                canais = sincronizar_pedidos(vendedor=vendedor)
            except ErroDeNegocio as erro:
                self.stdout.write(f"{vendedor.nome}: {erro.mensagem}")
                continue
            for canal in canais:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"{vendedor.nome} — {canal['canal']}: "
                        f"{canal['criados']} novos, {canal['atualizados']} atualizados"
                    )
                )
