import pytest
from django.http import HttpResponse
from django.test import RequestFactory
from rest_framework_simplejwt.tokens import AccessToken

from apps.contas.tests.factories import VendedorFactory
from apps.core.middleware import TenantMiddleware
from apps.core.testing.models import RecursoDeTeste


@pytest.mark.django_db
class TestIsolamentoEntreTenants:
    def test_usuario_do_vendedor_a_nao_acessa_recurso_do_vendedor_b(self):
        vendedor_a = VendedorFactory()
        vendedor_b = VendedorFactory()
        RecursoDeTeste.objects_todos.create(vendedor=vendedor_a, nome="recurso-a")
        RecursoDeTeste.objects_todos.create(vendedor=vendedor_b, nome="recurso-b")

        token_do_vendedor_a = AccessToken()
        token_do_vendedor_a["vendedor_id"] = str(vendedor_a.id)
        request = RequestFactory().get("/", HTTP_AUTHORIZATION=f"Bearer {token_do_vendedor_a}")

        nomes_vistos = {}

        def view(req):
            nomes_vistos["valor"] = list(RecursoDeTeste.objects.values_list("nome", flat=True))
            return HttpResponse()

        TenantMiddleware(view)(request)

        assert nomes_vistos["valor"] == ["recurso-a"]

    def test_sem_contexto_de_tenant_manager_padrao_nao_vaza_dados(self):
        vendedor = VendedorFactory()
        RecursoDeTeste.objects_todos.create(vendedor=vendedor, nome="recurso")

        assert list(RecursoDeTeste.objects.all()) == []

    def test_objects_todos_enxerga_todos_os_vendedores(self):
        vendedor_a = VendedorFactory()
        vendedor_b = VendedorFactory()
        RecursoDeTeste.objects_todos.create(vendedor=vendedor_a, nome="recurso-a")
        RecursoDeTeste.objects_todos.create(vendedor=vendedor_b, nome="recurso-b")

        assert RecursoDeTeste.objects_todos.count() == 2
