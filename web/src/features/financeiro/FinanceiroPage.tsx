import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  ChevronRightIcon,
  InformationCircleIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline'

import { useAuth } from '@/shared/auth/AuthContext'
import { cn } from '@/shared/lib/cn'
import { Card } from '@/shared/ui/Card'

import { BarrasHorizontais, GraficoTemporal, Rosca } from './graficos'
import {
  agruparPor,
  calcularIndicadores,
  coberturaDeEstoque,
  faturamentoPorCategoria,
  intervaloDoPeriodo,
  pedidosPorDiaDaSemana,
  pedidosPorStatus,
  produtosMaisVendidos,
  serieTemporal,
  variacao,
  vendasEntre,
  type Granularidade,
  type Periodo,
} from './metricas'
import { ESTILOS_STATUS_VENDA, ROTULOS_STATUS_VENDA, useVendas } from './vendas'

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const moedaCompacta = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
})
const inteiro = new Intl.NumberFormat('pt-BR')
const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
const percentual = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 })
const dataCurta = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})
const dataHoje = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const ROTULOS_PERIODO: Record<Periodo, string> = {
  '7d': '7 dias',
  '30d': '30 dias',
  '90d': '90 dias',
  '12m': '12 meses',
}

const ROTULOS_GRANULARIDADE: Record<Granularidade, string> = {
  semanal: 'Últimas 12 semanas',
  mensal: 'Últimos 12 meses',
  anual: 'Por ano',
}

function estiloSegmento(ativo: boolean) {
  return cn(
    'px-3 py-1.5 text-sm font-medium transition-colors first:rounded-l-md last:rounded-r-md focus-visible:relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA]',
    ativo ? 'bg-[#005DAA] text-white' : 'bg-background text-foreground hover:bg-[#85FA51]/10',
  )
}

function Segmentado<T extends string>({
  opcoes,
  valor,
  onChange,
  rotulo,
}: {
  opcoes: Record<T, string>
  valor: T
  onChange: (valor: T) => void
  rotulo: string
}) {
  return (
    <div
      aria-label={rotulo}
      className="flex divide-x divide-border overflow-hidden rounded-md border border-border shadow-sm"
      role="group"
    >
      {(Object.keys(opcoes) as T[]).map((opcao) => (
        <button
          aria-pressed={valor === opcao}
          className={estiloSegmento(valor === opcao)}
          key={opcao}
          onClick={() => onChange(opcao)}
          type="button"
        >
          {opcoes[opcao]}
        </button>
      ))}
    </div>
  )
}

function Variacao({ valor, inverter = false }: { valor: number | null; inverter?: boolean }) {
  if (valor === null) {
    return <span className="text-xs text-muted-foreground">sem base</span>
  }
  const subiu = valor >= 0
  const bom = inverter ? !subiu : subiu
  const Icone = subiu ? ArrowTrendingUpIcon : ArrowTrendingDownIcon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold',
        bom ? 'bg-[#85FA51]/25 text-[#1f5c0a]' : 'bg-red-100 text-red-800',
      )}
    >
      <Icone aria-hidden="true" className="h-3.5 w-3.5" />
      {subiu ? '+' : ''}
      {percentual.format(valor)}
    </span>
  )
}

function Indicador({
  rotulo,
  valor,
  delta,
  descricao,
  inverter,
  compacto = false,
}: {
  rotulo: string
  valor: string
  delta: number | null
  descricao: ReactNode
  inverter?: boolean
  compacto?: boolean
}) {
  return (
    <Card className={cn('flex flex-col gap-2', compacto ? 'p-4' : 'p-5')}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{rotulo}</p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={cn('font-semibold text-[#00305c]', compacto ? 'text-xl' : 'text-2xl')}>
          {valor}
        </p>
        <Variacao inverter={inverter} valor={delta} />
      </div>
      <p className="text-xs text-muted-foreground">{descricao}</p>
    </Card>
  )
}

function Painel({
  titulo,
  subtitulo,
  acoes,
  children,
  className,
}: {
  titulo: string
  subtitulo?: string
  acoes?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={cn('flex flex-col p-5', className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#00305c]">{titulo}</h2>
          {subtitulo && <p className="mt-0.5 text-xs text-muted-foreground">{subtitulo}</p>}
        </div>
        {acoes}
      </div>
      {children}
    </Card>
  )
}

function diferenca(atual: number, anterior: number, formatar: (v: number) => string) {
  const delta = atual - anterior
  return (
    <>
      <span className={cn('font-semibold', delta >= 0 ? 'text-[#1f5c0a]' : 'text-red-700')}>
        {delta >= 0 ? '+' : '−'}
        {formatar(Math.abs(delta))}
      </span>{' '}
      vs. período anterior
    </>
  )
}

export function FinanceiroPage() {
  const { usuario } = useAuth()
  const [periodo, setPeriodo] = useState<Periodo>('30d')
  const [granularidade, setGranularidade] = useState<Granularidade>('mensal')
  const [metrica, setMetrica] = useState<'faturamento' | 'pedidos'>('faturamento')
  const [verTabela, setVerTabela] = useState(false)
  const [incluirDemonstracao, setIncluirDemonstracao] = useState(true)

  const { hoje, vendas, reais, anuncios, pedidosReais, carregando } = useVendas(incluirDemonstracao)

  const painel = useMemo(() => {
    const { inicio, fim, inicioAnterior } = intervaloDoPeriodo(periodo, hoje)
    const doPeriodo = vendasEntre(vendas, inicio, fim)
    const anteriores = vendasEntre(vendas, inicioAnterior, new Date(inicio.getTime() - 1))
    return {
      doPeriodo,
      atual: calcularIndicadores(doPeriodo),
      anterior: calcularIndicadores(anteriores),
      categorias: faturamentoPorCategoria(doPeriodo),
      maisVendidos: produtosMaisVendidos(doPeriodo),
      canais: agruparPor(doPeriodo, (v) => v.canal),
      pagamentos: agruparPor(
        doPeriodo,
        (v) => v.formaPagamento,
        () => 1,
      ),
      diasDaSemana: pedidosPorDiaDaSemana(doPeriodo),
      status: pedidosPorStatus(doPeriodo),
    }
  }, [hoje, periodo, vendas])

  const serie = useMemo(
    () => serieTemporal(vendas, granularidade, hoje),
    [granularidade, hoje, vendas],
  )
  const cobertura = useMemo(
    () => coberturaDeEstoque(anuncios.data ?? [], vendas, hoje).slice(0, 5),
    [anuncios.data, hoje, vendas],
  )

  const { atual, anterior } = painel
  const primeiroNome = usuario?.nome.split(' ')[0] ?? ''
  const nomePeriodo = ROTULOS_PERIODO[periodo]
  const totalStatus = painel.status.reduce((soma, s) => soma + s.valor, 0)
  const maxDiaSemana = Math.max(...painel.diasDaSemana.map((d) => d.valor), 0)
  const ultimasVendas = painel.doPeriodo.slice(0, 6)
  const datasReais = [...new Set(reais.map((v) => v.data.toLocaleDateString('pt-BR')))]

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#00305c]">
            Olá, {primeiroNome}! Veja como está sua loja
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Faturamento, pedidos e desempenho dos seus canais de venda.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmentado
            onChange={setPeriodo}
            opcoes={ROTULOS_PERIODO}
            rotulo="Período dos indicadores"
            valor={periodo}
          />
          <span className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm shadow-sm">
            <CalendarDaysIcon className="h-4 w-4 text-[#005DAA]" />
            Hoje, {dataHoje.format(hoje).replace('.', '')}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-[#005DAA]/20 bg-[#005DAA]/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <InformationCircleIcon className="h-5 w-5 shrink-0 text-[#005DAA]" />
          <p className="text-sm text-[#00305c]">
            {pedidosReais.isError ? (
              <>
                Não foi possível ler suas vendas do Mercado Livre — conecte a conta em{' '}
                <Link className="font-medium underline" to="/canais">
                  Canais
                </Link>
                .{' '}
              </>
            ) : (
              <>
                Sua conta do Mercado Livre tem{' '}
                <strong>
                  {reais.length} {reais.length === 1 ? 'venda real' : 'vendas reais'}
                </strong>
                {datasReais.length > 0 && ` (${datasReais.join(', ')})`}.{' '}
              </>
            )}
            {incluirDemonstracao
              ? 'Para os gráficos de tendência fazerem sentido, o painel inclui um histórico de demonstração gerado com os seus produtos.'
              : 'Exibindo somente vendas reais.'}
          </p>
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm font-medium text-[#00305c]">
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
          Incluir dados de demonstração
        </label>
      </div>

      {carregando ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Carregando vendas...</p>
      ) : (
        <div
          className={cn('space-y-6 transition-opacity', pedidosReais.isFetching && 'opacity-60')}
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Indicador
              delta={variacao(atual.faturamento, anterior.faturamento)}
              descricao={diferenca(atual.faturamento, anterior.faturamento, moeda.format)}
              rotulo="Faturamento bruto"
              valor={moeda.format(atual.faturamento)}
            />
            <Indicador
              delta={variacao(atual.pedidos, anterior.pedidos)}
              descricao={diferenca(
                atual.pedidos,
                anterior.pedidos,
                (v) => `${inteiro.format(v)} pedidos`,
              )}
              rotulo="Pedidos"
              valor={inteiro.format(atual.pedidos)}
            />
            <Indicador
              delta={variacao(atual.ticketMedio, anterior.ticketMedio)}
              descricao={diferenca(atual.ticketMedio, anterior.ticketMedio, moeda.format)}
              rotulo="Ticket médio"
              valor={moeda.format(atual.ticketMedio)}
            />
            <Indicador
              delta={variacao(atual.receitaLiquida, anterior.receitaLiquida)}
              descricao="Após tarifas, frete e devoluções"
              rotulo="Receita líquida"
              valor={moeda.format(atual.receitaLiquida)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Indicador
              compacto
              delta={variacao(atual.unidades, anterior.unidades)}
              descricao={`Em ${nomePeriodo}`}
              rotulo="Unidades vendidas"
              valor={inteiro.format(atual.unidades)}
            />
            <Indicador
              compacto
              delta={variacao(atual.itensPorPedido, anterior.itensPorPedido)}
              descricao="Média de unidades por pedido"
              rotulo="Itens por pedido"
              valor={decimal.format(atual.itensPorPedido)}
            />
            <Indicador
              compacto
              delta={variacao(atual.tarifas, anterior.tarifas)}
              descricao={`${percentual.format(atual.faturamento ? atual.tarifas / atual.faturamento : 0)} do faturamento em comissões`}
              inverter
              rotulo="Tarifas de marketplace"
              valor={moeda.format(atual.tarifas)}
            />
            <Indicador
              compacto
              delta={variacao(atual.taxaCancelamentoDevolucao, anterior.taxaCancelamentoDevolucao)}
              descricao={`${moeda.format(atual.devolucoes)} em devoluções`}
              inverter
              rotulo="Cancelamentos e devoluções"
              valor={percentual.format(atual.taxaCancelamentoDevolucao)}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Painel
              acoes={
                <div className="flex flex-wrap items-center gap-2">
                  <Segmentado
                    onChange={setMetrica}
                    opcoes={{ faturamento: 'Faturamento', pedidos: 'Pedidos' }}
                    rotulo="Métrica do gráfico"
                    valor={metrica}
                  />
                  <select
                    aria-label="Agrupamento do gráfico"
                    className="h-9 rounded-md border border-border bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA]"
                    onChange={(e) => setGranularidade(e.target.value as Granularidade)}
                    value={granularidade}
                  >
                    <option value="semanal">Semanal</option>
                    <option value="mensal">Mensal</option>
                    <option value="anual">Anual</option>
                  </select>
                  <button
                    aria-label={verTabela ? 'Ver como gráfico' : 'Ver como tabela'}
                    aria-pressed={verTabela}
                    className={cn(
                      'rounded-md border border-border p-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA]',
                      verTabela
                        ? 'bg-[#005DAA] text-white'
                        : 'bg-background text-muted-foreground hover:text-foreground',
                    )}
                    onClick={() => setVerTabela((atual) => !atual)}
                    title={verTabela ? 'Ver como gráfico' : 'Ver como tabela'}
                    type="button"
                  >
                    <TableCellsIcon className="h-4 w-4" />
                  </button>
                </div>
              }
              className="xl:col-span-2"
              subtitulo={ROTULOS_GRANULARIDADE[granularidade]}
              titulo="Volume de vendas"
            >
              {verTabela ? (
                <div className="max-h-[260px] overflow-y-auto rounded-md border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-[#f2f7fb] text-xs font-semibold uppercase tracking-wide text-[#005DAA]">
                      <tr>
                        <th className="px-4 py-2">Período</th>
                        <th className="px-4 py-2 text-right">Faturamento</th>
                        <th className="px-4 py-2 text-right">Pedidos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border tabular-nums">
                      {serie.map((ponto) => (
                        <tr key={ponto.chave}>
                          <td className="px-4 py-2 capitalize">{ponto.rotuloCompleto}</td>
                          <td className="px-4 py-2 text-right">
                            {moeda.format(ponto.faturamento)}
                          </td>
                          <td className="px-4 py-2 text-right">{inteiro.format(ponto.pedidos)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <GraficoTemporal
                  formatarEixo={(v) =>
                    metrica === 'faturamento' ? moedaCompacta.format(v) : inteiro.format(v)
                  }
                  formatarValor={(v) =>
                    metrica === 'faturamento'
                      ? moeda.format(v)
                      : `${inteiro.format(v)} ${v === 1 ? 'pedido' : 'pedidos'}`
                  }
                  nomeMetrica={metrica === 'faturamento' ? 'Faturamento' : 'Pedidos'}
                  pontos={serie.map((ponto) => ({
                    rotulo: ponto.rotulo,
                    rotuloCompleto: ponto.rotuloCompleto,
                    valor: ponto[metrica],
                  }))}
                  tipo={granularidade === 'anual' ? 'colunas' : 'area'}
                />
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                * O último período ainda está em andamento — os valores são parciais.
              </p>
            </Painel>

            <Painel subtitulo={`Faturamento em ${nomePeriodo}`} titulo="Vendas por categoria">
              {painel.categorias.length > 0 ? (
                <Rosca
                  fatias={painel.categorias}
                  formatarValor={(v) => moedaCompacta.format(v)}
                  rotuloTotal="Total"
                />
              ) : (
                <SemDados />
              )}
            </Painel>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Painel
              acoes={
                <Link
                  className="flex items-center gap-0.5 text-sm font-medium text-[#005DAA] hover:underline"
                  to="/pedidos"
                >
                  Ver todos
                  <ChevronRightIcon className="h-4 w-4" />
                </Link>
              }
              className="xl:col-span-2"
              subtitulo={`Mais recentes em ${nomePeriodo}`}
              titulo="Últimas vendas"
            >
              {ultimasVendas.length > 0 ? (
                <div className="-mx-5 overflow-x-auto">
                  <table className="w-full min-w-[600px] text-left text-sm">
                    <thead className="border-y border-border bg-[#005DAA]/5 text-xs font-semibold uppercase tracking-wide text-[#005DAA]">
                      <tr>
                        <th className="px-5 py-2.5">Pedido</th>
                        <th className="px-3 py-2.5">Produto</th>
                        <th className="px-3 py-2.5">Canal e pagamento</th>
                        <th className="px-3 py-2.5 text-right">Valor</th>
                        <th className="px-5 py-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {ultimasVendas.map((venda) => (
                        <tr className="transition-colors hover:bg-[#85FA51]/10" key={venda.id}>
                          <td className="whitespace-nowrap px-5 py-3">
                            <p>
                              <span className="font-mono text-xs font-medium">
                                #{venda.id.replace('DEMO-', '')}
                              </span>
                              {venda.real && (
                                <span className="ml-2 rounded bg-[#005DAA] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                                  Real
                                </span>
                              )}
                            </p>
                            <p className="text-xs tabular-nums text-muted-foreground">
                              {dataCurta.format(venda.data)}
                            </p>
                          </td>
                          <td className="max-w-[240px] px-3 py-3">
                            <p className="truncate">{venda.itens[0]?.titulo}</p>
                            {venda.itens.length > 1 && (
                              <p className="text-xs text-muted-foreground">
                                + {venda.itens.length - 1} item
                              </p>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3">
                            <p>{venda.canal}</p>
                            <p className="text-xs text-muted-foreground">
                              {venda.formaPagamento}
                              {venda.parcelas > 1 && ` · ${venda.parcelas}x`}
                            </p>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-right font-medium tabular-nums text-[#00305c]">
                            {moeda.format(venda.total)}
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={cn(
                                'whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium',
                                ESTILOS_STATUS_VENDA[venda.status].badge,
                              )}
                            >
                              {ROTULOS_STATUS_VENDA[venda.status]}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <SemDados />
              )}
            </Painel>

            <Painel subtitulo={`Por unidades em ${nomePeriodo}`} titulo="Produtos mais vendidos">
              {painel.maisVendidos.length > 0 ? (
                <ol className="flex flex-col gap-4">
                  {painel.maisVendidos.map((produto, posicao) => (
                    <li className="flex items-start gap-3" key={produto.produtoId}>
                      <span
                        className={cn(
                          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                          posicao === 0 ? 'bg-[#005DAA] text-white' : 'bg-muted text-[#00305c]',
                        )}
                      >
                        {posicao + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        {produto.produtoId.startsWith('DEMO-') ? (
                          <p className="truncate text-sm text-foreground">{produto.titulo}</p>
                        ) : (
                          <Link
                            className="block truncate text-sm text-foreground hover:text-[#005DAA] hover:underline"
                            to={`/catalogo/${encodeURIComponent(produto.produtoId)}`}
                          >
                            {produto.titulo}
                          </Link>
                        )}
                        <p className="text-xs text-muted-foreground">{produto.categoria}</p>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-[#005DAA]"
                            style={{
                              width: `${(produto.unidades / painel.maisVendidos[0].unidades) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold tabular-nums text-[#00305c]">
                          {inteiro.format(produto.unidades)} un.
                        </p>
                        <p className="text-xs tabular-nums text-muted-foreground">
                          {moedaCompacta.format(produto.faturamento)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <SemDados />
              )}
            </Painel>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Painel subtitulo={`Faturamento em ${nomePeriodo}`} titulo="Vendas por canal">
              {painel.canais.length > 0 ? (
                <BarrasHorizontais
                  detalhe={(item, total) => percentual.format(total ? item.valor / total : 0)}
                  formatarValor={(v) => moedaCompacta.format(v)}
                  itens={painel.canais}
                />
              ) : (
                <SemDados />
              )}
            </Painel>

            <Painel subtitulo={`Pedidos em ${nomePeriodo}`} titulo="Formas de pagamento">
              {painel.pagamentos.length > 0 ? (
                <BarrasHorizontais
                  detalhe={(item, total) => percentual.format(total ? item.valor / total : 0)}
                  formatarValor={(v) => inteiro.format(v)}
                  itens={painel.pagamentos}
                />
              ) : (
                <SemDados />
              )}
            </Painel>

            <Painel
              className="md:col-span-2 xl:col-span-1"
              subtitulo={`Pedidos em ${nomePeriodo} — destaque no dia mais forte`}
              titulo="Pedidos por dia da semana"
            >
              {maxDiaSemana > 0 ? (
                <div className="flex h-44 items-end gap-2">
                  {painel.diasDaSemana.map((dia) => {
                    const pico = dia.valor === maxDiaSemana
                    return (
                      <div
                        className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                        key={dia.rotulo}
                        title={`${dia.rotulo}: ${inteiro.format(dia.valor)} pedidos`}
                      >
                        <span
                          className={cn(
                            'text-xs tabular-nums',
                            pico
                              ? 'font-semibold text-[#00305c]'
                              : 'text-muted-foreground opacity-0 group-hover:opacity-100',
                          )}
                        >
                          {inteiro.format(dia.valor)}
                        </span>
                        <div
                          className="w-full max-w-10 rounded-t"
                          style={{
                            backgroundColor: pico ? '#005DAA' : '#b7d3f6',
                            height: `${Math.max((dia.valor / maxDiaSemana) * 100, 2)}%`,
                          }}
                        />
                        <span className="text-xs text-muted-foreground">{dia.rotulo}</span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <SemDados />
              )}
            </Painel>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Painel
              subtitulo={`${inteiro.format(totalStatus)} pedidos em ${nomePeriodo}`}
              titulo="Status dos pedidos"
            >
              {totalStatus > 0 ? (
                <>
                  <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
                    {painel.status
                      .filter((s) => s.valor > 0)
                      .map((s) => (
                        <div
                          key={s.status}
                          style={{
                            backgroundColor: ESTILOS_STATUS_VENDA[s.status].barra,
                            width: `${(s.valor / totalStatus) * 100}%`,
                          }}
                          title={`${ROTULOS_STATUS_VENDA[s.status]}: ${s.valor}`}
                        />
                      ))}
                  </div>
                  <ul className="mt-4 flex flex-col gap-2 text-sm">
                    {painel.status.map((s) => (
                      <li className="flex items-center justify-between" key={s.status}>
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-sm"
                            style={{ backgroundColor: ESTILOS_STATUS_VENDA[s.status].barra }}
                          />
                          {ROTULOS_STATUS_VENDA[s.status]}
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          <span className="font-semibold text-[#00305c]">
                            {inteiro.format(s.valor)}
                          </span>{' '}
                          · {percentual.format(s.valor / totalStatus)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <SemDados />
              )}
            </Painel>

            <Painel
              acoes={
                <Link
                  className="flex items-center gap-0.5 text-sm font-medium text-[#005DAA] hover:underline"
                  to="/catalogo?ordem=mais_vendidos"
                >
                  Ver catálogo
                  <ChevronRightIcon className="h-4 w-4" />
                </Link>
              }
              className="xl:col-span-2"
              subtitulo="Dias de estoque no ritmo de vendas dos últimos 30 dias"
              titulo="Cobertura de estoque"
            >
              {cobertura.length > 0 ? (
                <div className="-mx-5 overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="border-y border-border bg-[#005DAA]/5 text-xs font-semibold uppercase tracking-wide text-[#005DAA]">
                      <tr>
                        <th className="px-5 py-2.5">Produto</th>
                        <th className="px-3 py-2.5 text-right">Estoque</th>
                        <th className="px-3 py-2.5 text-right">Vendas/dia</th>
                        <th className="px-5 py-2.5">Cobertura</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {cobertura.map(({ produto, vendasPorDia, diasRestantes }) => {
                        const nivel =
                          diasRestantes === null
                            ? 'parado'
                            : diasRestantes < 7
                              ? 'critico'
                              : diasRestantes < 21
                                ? 'atencao'
                                : 'ok'
                        const estilo = {
                          critico: 'bg-red-100 text-red-800',
                          atencao: 'bg-amber-100 text-amber-800',
                          ok: 'bg-[#85FA51]/25 text-[#1f5c0a]',
                          parado: 'bg-muted text-muted-foreground',
                        }[nivel]
                        return (
                          <tr key={produto.id}>
                            <td className="max-w-[280px] px-5 py-3">
                              <Link
                                className="flex items-center gap-3 hover:text-[#005DAA]"
                                to={`/catalogo/${encodeURIComponent(produto.id)}`}
                              >
                                <img
                                  alt=""
                                  className="h-9 w-9 shrink-0 rounded-md border border-border bg-white object-contain"
                                  src={produto.foto}
                                />
                                <span className="truncate">{produto.nome}</span>
                              </Link>
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums">
                              {produto.estoque} un.
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                              {decimal.format(vendasPorDia)}
                            </td>
                            <td className="px-5 py-3">
                              <span
                                className={cn(
                                  'whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium',
                                  estilo,
                                )}
                              >
                                {diasRestantes === null
                                  ? 'Sem vendas recentes'
                                  : diasRestantes < 1
                                    ? 'Esgota hoje'
                                    : `${inteiro.format(Math.floor(diasRestantes))} dias`}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <SemDados texto="Conecte o Mercado Livre para acompanhar o estoque dos anúncios." />
              )}
            </Painel>
          </div>
        </div>
      )}
    </section>
  )
}

function SemDados({ texto = 'Nenhuma venda neste período.' }: { texto?: string }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{texto}</p>
}
