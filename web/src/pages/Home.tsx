import { useQuery } from '@tanstack/react-query'

import { api } from '@/shared/api/client'
import { useAuth } from '@/shared/auth/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card'
import type { ResumoCanalMercadoLivre } from '@/shared/api/types'

const formatarMoeda = (valor: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)

export function Home() {
  const { usuario } = useAuth()

  const { data: resumo, isLoading } = useQuery({
    queryKey: ['canais', 'mercado-livre', 'resumo'],
    queryFn: async () => {
      const { data } = await api.get<ResumoCanalMercadoLivre>('/canais/mercado-livre/resumo')
      return data
    },
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Olá, {usuario?.nome}</h1>
        <p className="mt-1 text-muted-foreground">
          Perfil: {usuario?.perfil} — Vendedor: {usuario?.vendedor.nome}
        </p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando canais...</p>}

      {resumo && (
        <>
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              Mercado Livre — {resumo.vendedor_nickname} (dados simulados, teste temporário)
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Anúncios</p>
                  <p className="text-2xl font-semibold">{resumo.totais.anuncios}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Pedidos</p>
                  <p className="text-2xl font-semibold">{resumo.totais.pedidos}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Envios</p>
                  <p className="text-2xl font-semibold">{resumo.totais.envios}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Receita total</p>
                  <p className="text-2xl font-semibold">{formatarMoeda(resumo.receita_total)}</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Produtos mais vendidos</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {resumo.top_produtos.map((produto) => (
                  <div key={produto.id} className="flex items-center justify-between text-sm">
                    <span>{produto.title}</span>
                    <span className="text-muted-foreground">{produto.sold_quantity} vendidos</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pedidos recentes</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {resumo.pedidos_recentes.map((pedido) => (
                  <div key={pedido.id} className="flex items-center justify-between text-sm">
                    <span>
                      {pedido.buyer_nickname} — {pedido.status}
                    </span>
                    <span className="text-muted-foreground">
                      {formatarMoeda(pedido.total_amount)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
