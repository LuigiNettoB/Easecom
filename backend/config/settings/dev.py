from .base import *  # noqa: F403
from .base import env

DEBUG = env.bool("DEBUG", default=True)
ALLOWED_HOSTS = [
    *env.list(
        "ALLOWED_HOSTS",
        default=["localhost", "127.0.0.1", "petunia-corporal-whimsical.ngrok-free.dev"],
    ),
    # Dev Tunnels do VS Code (callback OAuth do Mercado Livre em dev — ver README):
    # cada pessoa tem um subdomínio próprio, então liberamos o domínio inteiro.
    ".devtunnels.ms",
]
