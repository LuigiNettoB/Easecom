import { useCallback, useMemo, useState } from 'react'
import {
  ArrowDownTrayIcon,
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

import type { Produto } from '@/features/catalogo/produtos'
import { GraficoTemporal } from '@/features/financeiro/graficos'
import {
  ESTILOS_STATUS_VENDA,
  ROTULOS_STATUS_VENDA,
  useVendas,
  type StatusVenda,
  type Venda,
} from '@/features/financeiro/vendas'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { Input } from '@/shared/ui/Input'

import {
  ORDENACOES_PEDIDOS,
  ORDEM_STATUS,
  PERIODOS_PEDIDOS,
  aplicarStatusEOrdem,
  estaAtrasado,
  exportarCsv,
  filtrarSemStatus,
  seriePedidos,
  useFiltrosPedidos,
  valoresDaVenda,
  type OrdenacaoPedidos,
  type PeriodoPedidos,
} from './dados'
import { DetalhePedido } from './DetalhePedido'
import { iniciais, inteiro, moeda, moedaCompacta } from './formatos'

const POR_PAGINA = 15
const CANAIS = ['Mercado Livre', 'Shopee', 'Amazon', 'Magalu']
const PAGAMENTOS = ['Cartão de crédito', 'Pix', 'Saldo Mercado Pago', 'Boleto', 'Cartão de débito']

const dataHora = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})
const percentual = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 })

// etapas do fluxo feliz, na ordem em que o pedido anda
const FLUXO: { status: StatusVenda; titulo: string }[] = [
  { status: 'pago', titulo: 'Aguardando envio' },
  { status: 'enviado', titulo: 'Em trânsito' },
  { status: 'entregue', titulo: 'Entregues' },
]
const DESVIOS: { status: StatusVenda; titulo: string }[] = [
  { status: 'devolvido', titulo: 'Devolvidos' },
  { status: 'cancelado', titulo: 'Cancelados' },
]

function estiloSegmento(ativo: boolean) {
  return cn(
    'px-3 py-1.5 text-sm font-medium transition-colors focus-visible:relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA]',
    ativo ? 'bg-[#005DAA] text-white' : 'bg-background text-foreground hover:bg-[#85FA51]/10',
  )
}

function estiloChip(ativo: boolean) {
  return cn(
    'rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA]',
    ativo
      ? 'border-[#005DAA] bg-[#005DAA] text-white'
      : 'border-border bg-background text-foreground hover:bg-[#85FA51]/10',
  )
}

export function PedidosPage() {
  const [incluirDemonstracao, setIncluirDemonstracao] = useState(true)
  const { hoje, vendas, reais, anuncios, carregando } = useVendas(incluirDemonstracao)
  const acoes = useFiltrosPedidos()
  const { filtros, pagina } = acoes
  const [selecionada, setSelecionada] = useState<Venda | null>(null)
  const fecharDetalhe = useCallback(() => setSelecionada(null), [])

  const produtos = useMemo(
    () => new Map<string, Produto>((anuncios.data ?? []).map((p) => [p.id, p])),
    [anuncios.data],
  )
  const pedidosPorCliente = useMemo(() => {
    const contagem = new Map<string, number>()
    vendas.forEach((v) => contagem.set(v.comprador, (contagem.get(v.comprador) ?? 0) + 1))
    return contagem
  }, [vendas])

  const visao = useMemo(() => {
    const semStatus = filtrarSemStatus(vendas, filtros, hoje)
    const lista = aplicarStatusEOrdem(semStatus, filtros)
    const validos = lista.filter((v) => v.status !== 'cancelado')
    const faturamento = validos.reduce((soma, v) => soma + v.total, 0)
    const liquido = validos.reduce((soma, v) => soma + valoresDaVenda(v).liquido, 0)

    const porCliente = new Map<string, { nome: string; pedidos: number; total: number }>()
    for (const venda of validos) {
      const atual = porCliente.get(venda.comprador) ?? {
        nome: venda.comprador,
        pedidos: 0,
        total: 0,
      }
      atual.pedidos += 1
      atual.total += venda.total
      porCliente.set(venda.comprador, atual)
    }

    return {
      lista,
      contagemStatus: ORDEM_STATUS.map((status) => {
        const doStatus = semStatus.filter((v) => v.status === status)
        return {
          status,
          quantidade: doStatus.length,
          valor: doStatus.reduce((s, v) => s + v.total, 0),
        }
      }),
      totalSemStatus: semStatus.length,
      pedidos: validos.length,
      faturamento,
      liquido,
      ticket: validos.length ? faturamento / validos.length : 0,
      atrasados: vendas.filter((v) => estaAtrasado(v, hoje)).length,
      serie: seriePedidos(lista, filtros.periodo, hoje),
      melhoresClientes: [...porCliente.values()].sort((a, b) => b.total - a.total).slice(0, 5),
    }
  }, [filtros, hoje, vendas])

  const totalPaginas = Math.max(Math.ceil(visao.lista.length / POR_PAGINA), 1)
  const paginaAtual = Math.min(pagina, totalPaginas)
  const pagina_ = visao.lista.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA)
  const quantidadeStatus = (status: StatusVenda) =>
    visao.contagemStatus.find((c) => c.status === status)!

  const chips = [
    filtros.busca && {
      chave: 'q',
      rotulo: `"${filtros.busca}"`,
      remover: () => acoes.definirBusca(''),
    },
    filtros.status && {
      chave: 'status',
      rotulo: ROTULOS_STATUS_VENDA[filtros.status],
      remover: () => acoes.definirStatus(null),
    },
    ...filtros.canais.map((canal) => ({
      chave: `canal-${canal}`,
      rotulo: canal,
      remover: () => acoes.alternarCanal(canal),
    })),
    filtros.pagamento && {
      chave: 'pagamento',
      rotulo: filtros.pagamento,
      remover: () => acoes.definirPagamento(''),
    },
    filtros.somenteAtrasados && {
      chave: 'atrasados',
      rotulo: 'Atrasados',
      remover: acoes.alternarAtrasados,
    },
  ].filter(Boolean) as { chave: string; rotulo: string; remover: () => void }[]

  function cartaoStatus({ status, titulo }: { status: StatusVenda; titulo: string }) {
    const { quantidade, valor } = quantidadeStatus(status)
    const ativo = filtros.status === status
    return (
      <button
        aria-pressed={ativo}
        key={status}
        className={cn(
          'flex flex-1 flex-col gap-1 rounded-lg border bg-background p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA]',
          ativo ? 'border-[#005DAA] ring-2 ring-[#005DAA]/30' : 'border-border',
        )}
        onClick={() => acoes.definirStatus(ativo ? null : status)}
        type="button"
      >
        <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: ESTILOS_STATUS_VENDA[status].barra }}
          />
          {titulo}
        </span>
        <span className="text-2xl font-semibold text-[#00305c]">{inteiro.format(quantidade)}</span>
        <span className="text-xs text-muted-foreground">
          {moedaCompacta.format(valor)} ·{' '}
          {percentual.format(visao.totalSemStatus ? quantidade / visao.totalSemStatus : 0)}
        </span>
      </button>
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#00305c]">Pedidos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe, filtre e exporte os pedidos de todos os seus canais.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <button
              aria-checked={incluirDemonstracao}
              className={cn(
                'relative h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA] focus-visible:ring-offset-2',
                incluirDemonstracao ? 'bg-[#005DAA]' : 'bg-muted-foreground/30',
              )}
              onClick={() => setIncluirDemonstracao((atual) => !atual)}
              role="switch"
              type="button"
            >
              <span
                className={cn(
                  'absolute left-0 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                  incluirDemonstracao ? 'translate-x-[18px]' : 'translate-x-0.5',
                )}
              />
            </button>
            Dados de demonstração
            <span className="text-xs">({reais.length} pedidos reais)</span>
          </label>
          <Button
            className="flex items-center gap-2"
            disabled={visao.lista.length === 0}
            onClick={() => exportarCsv(visao.lista)}
            type="button"
            variant="outline"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Exportar CSV ({inteiro.format(visao.lista.length)})
          </Button>
        </div>
      </div>

      {/* Filtros — escopo: tudo abaixo */}
      <Card className="flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div
            aria-label="Período"
            className="flex shrink-0 divide-x divide-border self-start overflow-hidden rounded-md border border-border"
            role="group"
          >
            {(Object.keys(PERIODOS_PEDIDOS) as PeriodoPedidos[]).map((periodo) => (
              <button
                aria-pressed={filtros.periodo === periodo}
                className={estiloSegmento(filtros.periodo === periodo)}
                key={periodo}
                onClick={() => acoes.definirPeriodo(periodo)}
                type="button"
              >
                {PERIODOS_PEDIDOS[periodo]}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Buscar pedidos"
              className="pl-9 focus-visible:ring-[#005DAA]"
              onChange={(e) => acoes.definirBusca(e.target.value)}
              placeholder="Buscar por nº do pedido, cliente ou produto"
              value={filtros.busca}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              aria-label="Forma de pagamento"
              className="h-10 rounded-md border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA]"
              onChange={(e) => acoes.definirPagamento(e.target.value)}
              value={filtros.pagamento}
            >
              <option value="">Todos os pagamentos</option>
              {PAGAMENTOS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            <select
              aria-label="Ordenar pedidos"
              className="h-10 rounded-md border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA]"
              onChange={(e) => acoes.definirOrdem(e.target.value as OrdenacaoPedidos)}
              value={filtros.ordem}
            >
              {Object.entries(ORDENACOES_PEDIDOS).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-medium text-[#00305c]">Canais:</span>
          {CANAIS.map((canal) => (
            <button
              aria-pressed={filtros.canais.includes(canal)}
              className={estiloChip(filtros.canais.includes(canal))}
              key={canal}
              onClick={() => acoes.alternarCanal(canal)}
              type="button"
            >
              {canal}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-border" />
          <button
            aria-pressed={filtros.somenteAtrasados}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA]',
              filtros.somenteAtrasados
                ? 'border-red-600 bg-red-600 text-white'
                : 'border-red-200 bg-red-50 text-red-800 hover:bg-red-100',
            )}
            onClick={acoes.alternarAtrasados}
            type="button"
          >
            <ExclamationTriangleIcon className="h-3.5 w-3.5" />
            Atrasados ({inteiro.format(visao.atrasados)})
          </button>
          {chips.length > 0 && (
            <>
              <span className="mx-1 h-4 w-px bg-border" />
              {chips.map((chip) => (
                <span
                  className="flex items-center gap-1 rounded-md border border-border bg-muted/50 py-0.5 pl-2 pr-0.5 text-xs"
                  key={chip.chave}
                >
                  {chip.rotulo}
                  <button
                    aria-label={`Remover filtro ${chip.rotulo}`}
                    className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={chip.remover}
                    type="button"
                  >
                    <XMarkIcon className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
              <button
                className="text-xs font-medium text-[#005DAA] hover:underline"
                onClick={acoes.limparFiltros}
                type="button"
              >
                Limpar tudo
              </button>
            </>
          )}
        </div>
      </Card>

      {carregando ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Carregando pedidos...</p>
      ) : (
        <>
          {/* Funil de status */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
              {FLUXO.map((etapa, i) => (
                <div
                  className="flex flex-1 flex-col items-stretch gap-2 sm:flex-row sm:items-center"
                  key={etapa.status}
                >
                  {cartaoStatus(etapa)}
                  {i < FLUXO.length - 1 && (
                    <ArrowRightIcon
                      aria-hidden="true"
                      className="hidden h-5 w-5 shrink-0 text-muted-foreground sm:block"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 border-border lg:w-[34%] lg:border-l lg:pl-3">
              {DESVIOS.map((etapa) => cartaoStatus(etapa))}
            </div>
          </div>

          {/* Indicadores */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                rotulo: 'Pedidos válidos',
                valor: inteiro.format(visao.pedidos),
                detalhe: 'Sem contar cancelados',
              },
              {
                rotulo: 'Faturamento',
                valor: moeda.format(visao.faturamento),
                detalhe: 'Valor bruto dos pedidos',
              },
              {
                rotulo: 'Ticket médio',
                valor: moeda.format(visao.ticket),
                detalhe: 'Por pedido válido',
              },
              {
                rotulo: 'Você recebe',
                valor: moeda.format(visao.liquido),
                detalhe: `${percentual.format(visao.faturamento ? visao.liquido / visao.faturamento : 0)} após tarifas e frete`,
              },
            ].map((indicador) => (
              <Card className="p-5" key={indicador.rotulo}>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {indicador.rotulo}
                </p>
                <p className="mt-2 text-2xl font-semibold text-[#00305c]">{indicador.valor}</p>
                <p className="mt-1 text-xs text-muted-foreground">{indicador.detalhe}</p>
              </Card>
            ))}
          </div>

          {/* Volume + melhores clientes */}
          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="p-5 xl:col-span-2">
              <h2 className="text-base font-semibold text-[#00305c]">Volume de pedidos</h2>
              <p className="mb-4 mt-0.5 text-xs text-muted-foreground">
                Pedidos {visao.serie.unidade} com os filtros aplicados
              </p>
              {visao.serie.pontos.some((p) => p.valor > 0) ? (
                <GraficoTemporal
                  formatarEixo={(v) => inteiro.format(v)}
                  formatarValor={(v) => `${inteiro.format(v)} ${v === 1 ? 'pedido' : 'pedidos'}`}
                  nomeMetrica="Pedidos"
                  pontos={visao.serie.pontos}
                  tipo={visao.serie.pontos.length <= 31 ? 'colunas' : 'area'}
                />
              ) : (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  Nenhum pedido no recorte.
                </p>
              )}
            </Card>
            <Card className="p-5">
              <h2 className="text-base font-semibold text-[#00305c]">Melhores clientes</h2>
              <p className="mb-4 mt-0.5 text-xs text-muted-foreground">
                Por valor comprado no recorte
              </p>
              {visao.melhoresClientes.length > 0 ? (
                <ol className="flex flex-col gap-3">
                  {visao.melhoresClientes.map((cliente, posicao) => (
                    <li className="flex items-center gap-3" key={cliente.nome}>
                      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#005DAA]/10 text-xs font-semibold text-[#005DAA]">
                        {iniciais(cliente.nome)}
                        {posicao === 0 && (
                          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#85FA51] text-[9px] font-bold text-[#00305c]">
                            1
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-foreground">
                          {cliente.nome}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {cliente.pedidos} {cliente.pedidos === 1 ? 'pedido' : 'pedidos'}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-[#00305c]">
                        {moedaCompacta.format(cliente.total)}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Sem clientes no recorte.
                </p>
              )}
            </Card>
          </div>

          {/* Tabela */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b border-border bg-[#005DAA]/5 text-xs font-semibold uppercase tracking-wide text-[#005DAA]">
                  <tr>
                    <th className="px-5 py-3">Pedido</th>
                    <th className="px-3 py-3">Cliente</th>
                    <th className="px-3 py-3">Itens</th>
                    <th className="px-3 py-3">Canal</th>
                    <th className="px-3 py-3">Pagamento</th>
                    <th className="px-3 py-3 text-right">Valor</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pagina_.map((venda) => {
                    const produto = produtos.get(venda.itens[0]?.produtoId ?? '')
                    const atrasado = estaAtrasado(venda, hoje)
                    const { liquido } = valoresDaVenda(venda)
                    return (
                      <tr
                        className="cursor-pointer transition-colors hover:bg-[#85FA51]/10"
                        key={venda.id}
                        onClick={() => setSelecionada(venda)}
                      >
                        <td className="whitespace-nowrap px-5 py-3">
                          <button
                            className="font-mono text-xs font-medium text-[#00305c] hover:text-[#005DAA] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA]"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelecionada(venda)
                            }}
                            type="button"
                          >
                            #{venda.id.replace('DEMO-', '')}
                          </button>
                          {venda.real && (
                            <span className="ml-2 rounded bg-[#005DAA] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                              Real
                            </span>
                          )}
                          <p className="text-xs tabular-nums text-muted-foreground">
                            {dataHora.format(venda.data)}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <span className="flex items-center gap-2">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#005DAA]/10 text-[10px] font-semibold text-[#005DAA]">
                              {iniciais(venda.comprador)}
                            </span>
                            <span className="max-w-[160px] truncate">{venda.comprador}</span>
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="flex items-center gap-2">
                            {produto ? (
                              <img
                                alt=""
                                className="h-9 w-9 shrink-0 rounded-md border border-border bg-white object-contain"
                                src={produto.foto}
                              />
                            ) : (
                              <span className="h-9 w-9 shrink-0 rounded-md bg-muted" />
                            )}
                            <span className="min-w-0">
                              <span className="block max-w-[220px] truncate">
                                {venda.itens[0]?.titulo}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {venda.itens.reduce((s, i) => s + i.quantidade, 0)} un.
                                {venda.itens.length > 1 && ` · +${venda.itens.length - 1} produto`}
                              </span>
                            </span>
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <span className="rounded-full bg-[#005DAA]/10 px-2.5 py-1 text-xs font-medium text-[#005DAA]">
                            {venda.canal}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                          {venda.formaPagamento}
                          {venda.parcelas > 1 && (
                            <span className="block text-xs">{venda.parcelas}x sem juros</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right">
                          <span className="font-medium tabular-nums text-[#00305c]">
                            {moeda.format(venda.total)}
                          </span>
                          <span className="block text-xs tabular-nums text-muted-foreground">
                            líq. {moeda.format(liquido)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3">
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-1 text-xs font-medium',
                              ESTILOS_STATUS_VENDA[venda.status].badge,
                            )}
                          >
                            {ROTULOS_STATUS_VENDA[venda.status]}
                          </span>
                          {atrasado && (
                            <span className="mt-1 flex items-center gap-1 text-xs font-medium text-red-700">
                              <ExclamationTriangleIcon className="h-3.5 w-3.5" />
                              Atrasado
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {visao.lista.length === 0 ? (
              <div className="py-14 text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhum pedido encontrado com esses filtros.
                </p>
                <button
                  className="mt-2 text-sm font-medium text-[#005DAA] hover:underline"
                  onClick={acoes.limparFiltros}
                  type="button"
                >
                  Limpar filtros
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3 text-sm">
                <p className="text-muted-foreground">
                  Mostrando{' '}
                  <span className="font-medium text-foreground">
                    {inteiro.format((paginaAtual - 1) * POR_PAGINA + 1)}–
                    {inteiro.format(Math.min(paginaAtual * POR_PAGINA, visao.lista.length))}
                  </span>{' '}
                  de {inteiro.format(visao.lista.length)} pedidos
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    aria-label="Página anterior"
                    disabled={paginaAtual <= 1}
                    onClick={() => acoes.definirPagina(paginaAtual - 1)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </Button>
                  <span className="px-3 tabular-nums text-muted-foreground">
                    {paginaAtual} / {totalPaginas}
                  </span>
                  <Button
                    aria-label="Próxima página"
                    disabled={paginaAtual >= totalPaginas}
                    onClick={() => acoes.definirPagina(paginaAtual + 1)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      {selecionada && (
        <DetalhePedido
          hoje={hoje}
          onFechar={fecharDetalhe}
          pedidosDoCliente={pedidosPorCliente.get(selecionada.comprador) ?? 1}
          produtos={produtos}
          venda={selecionada}
        />
      )}
    </section>
  )
}
