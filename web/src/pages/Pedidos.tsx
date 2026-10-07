import { useState } from 'react'
import { BanknotesIcon, FunnelIcon } from '@heroicons/react/24/outline'

import { Card, CardContent } from '@/shared/ui/Card'
import { cn } from '@/shared/lib/cn'

type Canal = 'Mercado Livre' | 'Shopee' | 'Magalu'
type FiltroCanal = 'Todos' | Canal

type Status = 'Pago' | 'Enviado' | 'Pendente' | 'Cancelado'
type FiltroStatus = 'Todos' | Status

type Pedido = {
  id: string
  canal: Canal
  valor: number
  status: Status
  data: string
  cliente: string
}

const PEDIDOS: Pedido[] = [
  {
    id: '#MLB-1087542',
    canal: 'Mercado Livre',
    valor: 189,
    status: 'Enviado',
    data: '03/10/2026',
    cliente: 'Ana Oliveira',
  },
  {
    id: '#SHP-9842631',
    canal: 'Shopee',
    valor: 79.9,
    status: 'Pago',
    data: '03/10/2026',
    cliente: 'Bruno Santos',
  },
  {
    id: '#MGL-4719203',
    canal: 'Magalu',
    valor: 349,
    status: 'Pendente',
    data: '02/10/2026',
    cliente: 'Carla Mendes',
  },
  {
    id: '#MLB-1087531',
    canal: 'Mercado Livre',
    valor: 219.9,
    status: 'Enviado',
    data: '02/10/2026',
    cliente: 'Diego Lima',
  },
  {
    id: '#SHP-9842578',
    canal: 'Shopee',
    valor: 129.9,
    status: 'Pago',
    data: '01/10/2026',
    cliente: 'Elisa Rocha',
  },
  {
    id: '#MGL-4719188',
    canal: 'Magalu',
    valor: 59.9,
    status: 'Cancelado',
    data: '01/10/2026',
    cliente: 'Felipe Costa',
  },
  {
    id: '#MLB-1087519',
    canal: 'Mercado Livre',
    valor: 279,
    status: 'Pago',
    data: '30/09/2026',
    cliente: 'Gabriela Alves',
  },
  {
    id: '#SHP-9842520',
    canal: 'Shopee',
    valor: 34.9,
    status: 'Enviado',
    data: '30/09/2026',
    cliente: 'Henrique Souza',
  },
]

const FILTROS_CANAL: FiltroCanal[] = ['Todos', 'Mercado Livre', 'Shopee', 'Magalu']
const FILTROS_STATUS: FiltroStatus[] = ['Todos', 'Pago', 'Enviado', 'Pendente', 'Cancelado']

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

// Pago/Enviado usam as cores da marca; Pendente/Cancelado mantêm âmbar/vermelho
// semânticos, já que são sinais de atenção e não fazem sentido na paleta verde/azul.
const ESTILOS_STATUS: Record<Status, string> = {
  Pago: 'bg-[#85FA51]/25 text-[#1f5c0a]',
  Enviado: 'bg-[#005DAA]/10 text-[#005DAA]',
  Pendente: 'bg-amber-100 text-amber-800',
  Cancelado: 'bg-red-100 text-red-800',
}

function estiloFiltro(ativo: boolean) {
  return cn(
    'rounded-md border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA]',
    ativo
      ? 'border-[#005DAA] bg-[#005DAA] text-white'
      : 'border-border bg-background text-foreground hover:bg-[#85FA51]/10',
  )
}

export function Pedidos() {
  const [filtroCanal, setFiltroCanal] = useState<FiltroCanal>('Todos')
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('Todos')

  const pedidosFiltrados = PEDIDOS.filter(
    (pedido) =>
      (filtroCanal === 'Todos' || pedido.canal === filtroCanal) &&
      (filtroStatus === 'Todos' || pedido.status === filtroStatus),
  )

  // mesma base (pedidosFiltrados, já combinando canal + status) — os dois
  // cards mudam juntos conforme qualquer um dos filtros é alterado
  const lucroFiltrado = pedidosFiltrados.reduce((soma, pedido) => soma + pedido.valor, 0)

  const indicadores = [
    {
      rotulo: `Quantidade por canal ${filtroCanal} e por status ${filtroStatus}`,
      valor: pedidosFiltrados.length,
      icone: FunnelIcon,
      corIcone: 'text-[#005DAA]',
      corBorda: 'border-l-[#005DAA]',
    },
    {
      rotulo: `Lucro por canal ${filtroCanal} e por status ${filtroStatus}`,
      valor: moeda.format(lucroFiltrado),
      icone: BanknotesIcon,
      corIcone: 'text-[#1f5c0a]',
      corBorda: 'border-l-[#85FA51]',
    },
  ]

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#00305c]">Pedidos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Acompanhe os pedidos recebidos em todos os seus canais.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {indicadores.map((indicador) => {
          const Icone = indicador.icone
          return (
            <Card className={cn('border-l-4', indicador.corBorda)} key={indicador.rotulo}>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">{indicador.rotulo}</p>
                  <p className="mt-1 text-2xl sm:text-3xl font-semibold text-[#00305c]">{indicador.valor}</p>
                </div>
                <Icone className={cn('h-8 w-8 sm:h-9 sm:w-9 shrink-0', indicador.corIcone)} />
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <p className="mr-2 text-sm font-medium text-[#00305c]">Canal:</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar pedidos por canal">
          {FILTROS_CANAL.map((filtro) => (
            <button
              aria-pressed={filtroCanal === filtro}
              className={estiloFiltro(filtroCanal === filtro)}
              key={filtro}
              onClick={() => setFiltroCanal(filtro)}
              type="button"
            >
              {filtro}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <p className="mr-2 text-sm font-medium text-[#00305c]">Status:</p>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Filtrar pedidos por status"
        >
          {FILTROS_STATUS.map((filtro) => (
            <button
              aria-pressed={filtroStatus === filtro}
              className={estiloFiltro(filtroStatus === filtro)}
              key={filtro}
              onClick={() => setFiltroStatus(filtro)}
              type="button"
            >
              {filtro}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-background shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-border bg-[#005DAA]/5 text-xs font-semibold uppercase tracking-wide text-[#005DAA]">
              <tr>
                <th className="px-5 py-3">ID do pedido</th>
                <th className="px-5 py-3">Canal</th>
                <th className="px-5 py-3">Valor</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Data</th>
                <th className="px-5 py-3">Cliente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pedidosFiltrados.map((pedido) => (
                <tr className="transition-colors hover:bg-[#85FA51]/10" key={pedido.id}>
                  <td className="px-5 py-3 font-mono text-xs font-medium">{pedido.id}</td>
                  <td className="px-5 py-3">{pedido.canal}</td>
                  <td className="px-5 py-3 font-medium text-[#00305c]">
                    {moeda.format(pedido.valor)}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-1 text-xs font-medium',
                        ESTILOS_STATUS[pedido.status],
                      )}
                    >
                      {pedido.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{pedido.data}</td>
                  <td className="px-5 py-3">{pedido.cliente}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pedidosFiltrados.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            Nenhum pedido encontrado para este filtro.
          </p>
        )}
      </div>
    </section>
  )
}