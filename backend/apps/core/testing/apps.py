from django.apps import AppConfig


class CoreTestingConfig(AppConfig):
    """App carregado apenas em `config.settings.test`.

    Existe só para fornecer um model concreto de `ModeloMultiTenant`, usado
    para testar a infraestrutura de multi-tenancy (middleware + manager) sem
    depender de um módulo de negócio real.
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.core.testing"
    label = "core_testing"
