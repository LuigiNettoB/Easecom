from .base import *  # noqa: F403
from .base import env

DEBUG = False

INSTALLED_APPS = [*INSTALLED_APPS, "apps.core.testing"]  # noqa: F405

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("DB_TEST_NAME", default=env("DB_NAME", default="postgres")),
        "USER": env("DB_USER", default="postgres"),
        "PASSWORD": env("DB_PASSWORD", default=""),
        "HOST": env("DB_HOST", default="localhost"),
        "PORT": env("DB_PORT", default="5432"),
        "OPTIONS": {
            "sslmode": env("DB_SSLMODE", default="prefer"),
            # Só o schema `test`: com `public` no caminho, o Django enxerga as
            # tabelas de dev, acha que já estão migradas e os testes gravam no
            # banco de desenvolvimento. O CI (Postgres descartável) usa `public`.
            "options": f"-c search_path={env('DB_TEST_SCHEMA', default='test')}",
        },
        # Supabase não permite CREATE/DROP DATABASE pela role fornecida — os
        # testes rodam num schema `test` isolado dentro do mesmo banco (ver
        # README), então usam sempre o mesmo nome de banco de dev/teste e
        # dependem de `--reuse-db` (configurado em pyproject.toml) para nunca
        # tentar recriar o banco inteiro.
        "TEST": {"NAME": env("DB_TEST_NAME", default=env("DB_NAME", default="postgres"))},
    }
}

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
