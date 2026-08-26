from .base import *  # noqa: F403
from .base import env

DEBUG = False

INSTALLED_APPS = [*INSTALLED_APPS, "apps.core.testing"]  # noqa: F405

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("DB_TEST_NAME", default="hub_test"),
        "USER": env("DB_USER", default="hub"),
        "PASSWORD": env("DB_PASSWORD", default="hub"),
        "HOST": env("DB_HOST", default="localhost"),
        "PORT": env("DB_PORT", default="5432"),
        "TEST": {"NAME": env("DB_TEST_NAME", default="hub_test")},
    }
}

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
