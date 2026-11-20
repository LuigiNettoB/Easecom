from rest_framework import serializers

from apps.assistente.models import Conversa, Mensagem

TAMANHO_MAXIMO_PERGUNTA = 2000


class MensagemEntradaSerializer(serializers.Serializer):
    mensagem = serializers.CharField(max_length=TAMANHO_MAXIMO_PERGUNTA, trim_whitespace=True)
    conversa_id = serializers.UUIDField(required=False, allow_null=True)


class MensagemSaidaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mensagem
        fields = ["id", "papel", "conteudo", "criado_em"]


class ConversaResumoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Conversa
        fields = ["id", "titulo", "criado_em", "atualizado_em"]


class ConversaDetalheSerializer(serializers.ModelSerializer):
    mensagens = MensagemSaidaSerializer(many=True, read_only=True)

    class Meta:
        model = Conversa
        fields = ["id", "titulo", "criado_em", "atualizado_em", "mensagens"]


class LimiteDiarioSerializer(serializers.Serializer):
    limite = serializers.IntegerField()
    usadas = serializers.IntegerField()
    restantes = serializers.IntegerField()


class RespostaDoAssistenteSerializer(serializers.Serializer):
    conversa = ConversaResumoSerializer()
    mensagem = MensagemSaidaSerializer()
    limite_diario = LimiteDiarioSerializer()
