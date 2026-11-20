from django.contrib import admin

from apps.assistente.models import Conversa, Mensagem


class MensagemInline(admin.TabularInline):
    model = Mensagem
    extra = 0
    readonly_fields = ["papel", "conteudo", "criado_em"]


@admin.register(Conversa)
class ConversaAdmin(admin.ModelAdmin):
    list_display = ["titulo", "vendedor", "usuario", "atualizado_em"]
    list_filter = ["vendedor"]
    search_fields = ["titulo"]
    inlines = [MensagemInline]

    def get_queryset(self, request):
        return Conversa.objects_todos.select_related("vendedor", "usuario")
