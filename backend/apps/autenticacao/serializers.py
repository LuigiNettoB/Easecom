from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.arquivos.services import obter_url_arquivo
from apps.contas.models import Usuario, Vendedor


class CadastroEntradaSerializer(serializers.Serializer):
    nome_vendedor = serializers.CharField(max_length=150)
    nome_usuario = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    senha = serializers.CharField(write_only=True)

    def validate_senha(self, valor):
        validate_password(valor)
        return valor


class TrocarSenhaEntradaSerializer(serializers.Serializer):
    senha_atual = serializers.CharField(write_only=True)
    senha_nova = serializers.CharField(write_only=True)

    def validate_senha_nova(self, valor):
        validate_password(valor)
        return valor


class VendedorSaidaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendedor
        fields = ["id", "nome"]


class UsuarioSaidaSerializer(serializers.ModelSerializer):
    vendedor = VendedorSaidaSerializer(read_only=True)
    foto_perfil_url = serializers.SerializerMethodField()
    foto_banner_url = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = [
            "id",
            "email",
            "nome",
            "perfil",
            "vendedor",
            "criado_em",
            "foto_perfil_url",
            "foto_banner_url",
        ]

    def get_foto_perfil_url(self, obj):
        return obter_url_arquivo(arquivo=obj.foto_perfil) if obj.foto_perfil_id else None

    def get_foto_banner_url(self, obj):
        return obter_url_arquivo(arquivo=obj.foto_banner) if obj.foto_banner_id else None


class TokenObtainPersonalizadoSerializer(TokenObtainPairSerializer):
    """Inclui vendedor e perfil como claims do access token."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["vendedor_id"] = str(user.vendedor_id) if user.vendedor_id else None
        token["perfil"] = user.perfil
        token["email"] = user.email
        return token
