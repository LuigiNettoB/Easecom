"""Um adaptador por canal de venda.

Cada módulo expõe o mesmo contrato: `CANAL`, `esta_conectado(vendedor=...)` e
`buscar_pedidos(vendedor=...)`, que devolve `PedidoExterno`. Para integrar um
novo marketplace, crie o módulo dele e acrescente em `ADAPTADORES` — services,
rotas e front não mudam.
"""

from apps.pedidos.adaptadores import mercado_livre

ADAPTADORES = [mercado_livre]
