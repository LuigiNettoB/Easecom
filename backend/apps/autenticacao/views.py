from drf_spectacular.utils import extend_schema
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.arquivos.serializers import ArquivoEntradaSerializer
from apps.autenticacao.serializers import (
    CadastroEntradaSerializer,
    TokenObtainPersonalizadoSerializer,
    TrocarSenhaEntradaSerializer,
    UsuarioSaidaSerializer,
)
from apps.autenticacao.services import (
    atualizar_foto_banner,
    atualizar_foto_perfil,
    cadastrar_vendedor_e_administrador,
    trocar_senha,
)


@extend_schema(tags=["autenticacao"])
class CadastroView(APIView):
    """Cria um vendedor e seu usuário administrador."""

    permission_classes = [AllowAny]

    @extend_schema(
        request=CadastroEntradaSerializer,
        responses={201: UsuarioSaidaSerializer},
    )
    def post(self, request):
        entrada = CadastroEntradaSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        usuario = cadastrar_vendedor_e_administrador(**entrada.validated_data)
        saida = UsuarioSaidaSerializer(usuario)
        return Response(saida.data, status=201)


@extend_schema(tags=["autenticacao"])
class LoginView(TokenObtainPairView):
    """Autentica por e-mail/senha e retorna access + refresh token."""

    serializer_class = TokenObtainPersonalizadoSerializer


@extend_schema(tags=["autenticacao"])
class RefreshView(TokenRefreshView):
    """Renova o access token a partir de um refresh token válido."""


@extend_schema(tags=["eu"])
class EuView(APIView):
    """Retorna os dados do usuário autenticado."""

    @extend_schema(responses={200: UsuarioSaidaSerializer})
    def get(self, request):
        saida = UsuarioSaidaSerializer(request.user)
        return Response(saida.data)


@extend_schema(tags=["eu"])
class TrocarSenhaView(APIView):
    """Troca a senha do usuário autenticado."""

    @extend_schema(request=TrocarSenhaEntradaSerializer, responses={204: None})
    def post(self, request):
        entrada = TrocarSenhaEntradaSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        trocar_senha(usuario=request.user, **entrada.validated_data)
        return Response(status=204)


@extend_schema(tags=["eu"])
class FotoPerfilView(APIView):
    """Envia (ou substitui) a foto de perfil do usuário autenticado."""

    parser_classes = [MultiPartParser]

    @extend_schema(request=ArquivoEntradaSerializer, responses={200: UsuarioSaidaSerializer})
    def put(self, request):
        entrada = ArquivoEntradaSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        usuario = atualizar_foto_perfil(
            usuario=request.user, arquivo_upload=entrada.validated_data["arquivo"]
        )
        return Response(UsuarioSaidaSerializer(usuario).data)


@extend_schema(tags=["eu"])
class FotoBannerView(APIView):
    """Envia (ou substitui) a foto de banner do usuário autenticado."""

    parser_classes = [MultiPartParser]

    @extend_schema(request=ArquivoEntradaSerializer, responses={200: UsuarioSaidaSerializer})
    def put(self, request):
        entrada = ArquivoEntradaSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        usuario = atualizar_foto_banner(
            usuario=request.user, arquivo_upload=entrada.validated_data["arquivo"]
        )
        return Response(UsuarioSaidaSerializer(usuario).data)
