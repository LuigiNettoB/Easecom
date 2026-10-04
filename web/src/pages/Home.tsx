import { useQuery } from '@tanstack/react-query'

import { api } from '@/shared/api/client'
import { useAuth } from '@/shared/auth/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card'
import type { ResumoCanalMercadoLivre } from '@/shared/api/types'

const formatarMoeda = (valor: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)

const CORES_STATUS: Record<string, string> = {
  paid: 'bg-[#EAF3DE] text-[#27500A]',
  approved: 'bg-[#EAF3DE] text-[#27500A]',
  payment_required: 'bg-[#FAEEDA] text-[#633806]',
  payment_in_process: 'bg-[#FAEEDA] text-[#633806]',
  pending: 'bg-[#FAEEDA] text-[#633806]',
  invalid: 'bg-[#FCEBEB] text-[#791F1F]',
  cancelled: 'bg-[#FCEBEB] text-[#791F1F]',
}

const corStatus = (status: string) => CORES_STATUS[status] ?? 'bg-muted text-muted-foreground'

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
        <h1 className="text-2xl font-semibold text-[#00305c]">Olá, {usuario?.nome}</h1>
        <p className="mt-1 text-muted-foreground">
          Perfil: {usuario?.perfil} — Vendedor: {usuario?.vendedor.nome}
        </p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando canais...</p>}

      {resumo && (
        <>
          <div>
            <p className="mb-2 text-sm font-medium text-[#005DAA]">
              Mercado Livre — {resumo.vendedor_nickname} (dados simulados, teste temporário)
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Card className="border-l-4 border-l-[#85FA51] border-y-10 border-r-10 shadow-none">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Anúncios</p>
                  <p className="text-2xl font-semibold">{resumo.totais.anuncios}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-[#005DAA] border-y-10 border-r-10 shadow-none">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Pedidos</p>
                  <p className="text-2xl font-semibold">{resumo.totais.pedidos}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-[#85FA51] border-y-10 border-r-10 shadow-none">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Envios</p>
                  <p className="text-2xl font-semibold">{resumo.totais.envios}</p>
                </CardContent>
              </Card>
              <Card className="border-0 bg-[#005DAA] shadow-none">
                <CardContent className="p-4">
                  <p className="text-sm text-[#B5D4F4]">Receita total</p>
                  <p className="text-2xl font-semibold text-white">
                    {formatarMoeda(resumo.receita_total)}
                  </p>
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
                  <div
                    key={produto.id}
                    className="flex items-center justify-between border-b border-border pb-2 text-sm last:border-b-0 last:pb-0"
                  >
                    <span>{produto.title}</span>
                    <span className="font-medium text-[#3B6D11]">
                      {produto.sold_quantity} vendidos
                    </span>
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
                  <div
                    key={pedido.id}
                    className="flex items-center justify-between border-b border-border pb-2 text-sm last:border-b-0 last:pb-0"
                  >
                    <span className="flex items-center gap-2">
                      {pedido.buyer_nickname}
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${corStatus(pedido.status)}`}
                      >
                        {pedido.status}
                      </span>
                    </span>
                    <span className="font-medium">{formatarMoeda(pedido.total_amount)}</span>
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