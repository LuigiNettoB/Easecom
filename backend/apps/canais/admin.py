from django.contrib import admin

from apps.canais.models import MercadoLivreToken


@admin.register(MercadoLivreToken)
class MercadoLivreTokenAdmin(admin.ModelAdmin):
    list_display = ("vendedor", "ml_user_id", "expires_at", "criado_em")
    search_fields = ("vendedor__nome", "ml_user_id")
    readonly_fields = ("access_token", "refresh_token", "criado_em", "atualizado_em")

    def get_queryset(self, request):
        return MercadoLivreToken.objects_todos.all()
