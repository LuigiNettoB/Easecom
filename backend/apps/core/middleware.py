from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken

from apps.core import tenant_context


class TenantMiddleware:
    """Lê o vendedor a partir do JWT da requisição e o guarda no contexto.

    Não substitui a autenticação do DRF: se o token estiver ausente ou for
    inválido, apenas nenhum vendedor é definido no contexto e o
    `TenantManager` filtrará tudo como vazio. Quem decide se a requisição é
    permitida continua sendo `IsAuthenticated`/`JWTAuthentication`.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        tenant_context.definir_vendedor_id(self._extrair_vendedor_id(request))
        try:
            response = self.get_response(request)
        finally:
            tenant_context.limpar_vendedor_id()
        return response

    @staticmethod
    def _extrair_vendedor_id(request) -> str | None:
        cabecalho = request.headers.get("Authorization", "")
        if not cabecalho.startswith("Bearer "):
            return None
        token_bruto = cabecalho.removeprefix("Bearer ").strip()
        try:
            token = AccessToken(token_bruto)
        except TokenError:
            return None
        return token.get("vendedor_id")
