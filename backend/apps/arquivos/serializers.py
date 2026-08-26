from rest_framework import serializers

from apps.arquivos.models import Arquivo


class ArquivoEntradaSerializer(serializers.Serializer):
    arquivo = serializers.FileField()


class ArquivoSaidaSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = Arquivo
        fields = ["id", "nome_original", "content_type", "tamanho_bytes", "criado_em", "url"]

    def get_url(self, obj):
        return self.context.get("url")
