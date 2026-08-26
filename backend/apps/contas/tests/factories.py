import factory
from factory.django import DjangoModelFactory

from apps.contas.models import Perfil, Usuario, Vendedor

SENHA_PADRAO = "SenhaForte123!"


class VendedorFactory(DjangoModelFactory):
    class Meta:
        model = Vendedor

    nome = factory.Sequence(lambda n: f"Vendedor {n}")


class UsuarioFactory(DjangoModelFactory):
    class Meta:
        model = Usuario
        skip_postgeneration_save = True

    email = factory.Sequence(lambda n: f"usuario{n}@teste.com")
    nome = factory.Faker("name")
    vendedor = factory.SubFactory(VendedorFactory)
    perfil = Perfil.ADMINISTRADOR

    @factory.post_generation
    def senha(self, create, extracted, **kwargs):
        self.set_password(extracted or SENHA_PADRAO)
        if create:
            self.save()
