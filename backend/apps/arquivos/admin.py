from django.contrib import admin

from apps.arquivos.models import Arquivo


@admin.register(Arquivo)
class ArquivoAdmin(admin.ModelAdmin):
    list_display = ("nome_original", "vendedor", "content_type", "tamanho_bytes", "criado_em")
    list_filter = ("vendedor", "content_type")
    search_fields = ("nome_original", "caminho_storage")

    def get_queryset(self, request):
        return Arquivo.objects_todos.all()
