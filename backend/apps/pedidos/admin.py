from django.contrib import admin

from apps.pedidos.models import ItemPedido, Pedido


class ItemPedidoInline(admin.TabularInline):
    model = ItemPedido
    extra = 0


@admin.register(Pedido)
class PedidoAdmin(admin.ModelAdmin):
    list_display = ("id_externo", "vendedor", "canal", "status", "valor_total", "realizado_em")
    list_filter = ("canal", "status", "vendedor")
    search_fields = ("id_externo", "comprador_apelido")
    inlines = [ItemPedidoInline]

    def get_queryset(self, request):
        return Pedido.objects_todos.all()
