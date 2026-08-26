from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.contas.models import Perfil, Usuario, Vendedor

SENHA_DEMO = "DemoHub123!"

VENDEDORES_DEMO = [
    {
        "vendedor": "Loja Demo Um",
        "email": "demo1@hubmulticanal.com.br",
        "nome_usuario": "Usuário Demo Um",
    },
    {
        "vendedor": "Loja Demo Dois",
        "email": "demo2@hubmulticanal.com.br",
        "nome_usuario": "Usuário Demo Dois",
    },
]


class Command(BaseCommand):
    help = (
        "Cria dois vendedores de demonstração com um usuário administrador "
        "cada. Idempotente — pode ser executado várias vezes sem duplicar "
        "dados. Recusa execução quando DEBUG=False."
    )

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("seed_demo só pode ser executado com DEBUG=True.")

        for dados in VENDEDORES_DEMO:
            self._criar_se_nao_existir(dados)

    def _criar_se_nao_existir(self, dados):
        if Usuario.objects.filter(email=dados["email"]).exists():
            self.stdout.write(f"Já existe: {dados['email']} — nada a fazer.")
            return

        with transaction.atomic():
            vendedor = Vendedor.objects.create(nome=dados["vendedor"])
            Usuario.objects.create_user(
                email=dados["email"],
                senha=SENHA_DEMO,
                nome=dados["nome_usuario"],
                vendedor=vendedor,
                perfil=Perfil.ADMINISTRADOR,
            )
        self.stdout.write(self.style.SUCCESS(f"Criado: {dados['email']} (senha: {SENHA_DEMO})"))
