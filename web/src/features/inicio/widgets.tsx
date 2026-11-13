import { useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  ArrowUturnLeftIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
  ShoppingBagIcon,
  TruckIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'

import type { Produto } from '@/features/catalogo/produtos'
import { cn } from '@/shared/lib/cn'
import { Card } from '@/shared/ui/Card'

import { DIAS_MAPA, HORAS_MAPA, type EventoFeed, type Pendencia, type PontoRitmo } from './dados'
import { moeda, moedaCompacta } from './formatos'

const inteiro = new Intl.NumberFormat('pt-BR')
const percentual = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 })
const relativo = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })

const COR_HOJE = '#005DAA'
const COR_TIPICO = '#94a3b8'
const COR_GRADE = '#e5e7eb'
const COR_TEXTO_EIXO = '#64748b'

export function Painel({
  titulo,
  subtitulo,
  acao,
  children,
  className,
}: {
  titulo: string
  subtitulo?: ReactNode
  acao?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={cn('flex flex-col p-5', className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#00305c]">{titulo}</h2>
          {subtitulo && <p className="mt-0.5 text-xs text-muted-foreground">{subtitulo}</p>}
        </div>
        {acao}
      </div>
      {children}
    </Card>
  )
}

export function LinkPainel({ para, children }: { para: string; children: ReactNode }) {
  return (
    <Link
      className="flex shrink-0 items-center gap-0.5 text-sm font-medium text-[#005DAA] hover:underline"
      to={para}
    >
      {children}
      <ChevronRightIcon className="h-4 w-4" />
    </Link>
  )
}

export function Comparacao({
  atual,
  referencia,
  sufixo,
}: {
  atual: number
  referencia: number
  sufixo: string
}) {
  if (referencia <= 0) return <span className="text-xs text-white/60">sem histórico</span>
  const variacao = (atual - referencia) / referencia
  const subiu = variacao >= 0
  const Icone = subiu ? ArrowTrendingUpIcon : ArrowTrendingDownIcon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold',
        subiu ? 'bg-[#85FA51]/20 text-[#85FA51]' : 'bg-red-400/20 text-red-200',
      )}
    >
      <Icone aria-hidden="true" className="h-3.5 w-3.5" />
      {subiu ? '+' : ''}
      {percentual.format(variacao)} {sufixo}
    </span>
  )
}

// --- Ritmo do dia ----------------------------------------------------------------------------

function useLargura<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [largura, setLargura] = useState(0)
  useLayoutEffect(() => {
    if (!ref.current) return
    setLargura(ref.current.getBoundingClientRect().width)
    const observador = new ResizeObserver(([entrada]) => setLargura(entrada.contentRect.width))
    observador.observe(ref.current)
    return () => observador.disconnect()
  }, [])
  return [ref, largura] as const
}

function escalaBonita(maximo: number) {
  if (maximo <= 0) return { topo: 4, passo: 1 }
  const bruto = maximo / 4
  const magnitude = 10 ** Math.floor(Math.log10(bruto))
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((p) => p >= bruto)!
  return { topo: passo * 4, passo }
}

export function GraficoRitmo({ pontos, horaAtual }: { pontos: PontoRitmo[]; horaAtual: number }) {
  const [ref, largura] = useLargura<HTMLDivElement>()
  const [ativo, setAtivo] = useState<number | null>(null)

  const esquerda = 64
  const direita = 74 // espaço para os rótulos diretos no fim das linhas
  const topoPlot = 10
  const altura = 270
  const larguraPlot = Math.max(largura - esquerda - direita, 0)
  const maximo = Math.max(...pontos.map((p) => Math.max(p.hoje ?? 0, p.tipico)))
  const { topo, passo } = escalaBonita(maximo)
  const x = (hora: number) => esquerda + (hora / 23) * larguraPlot
  const y = (valor: number) => topoPlot + altura - (valor / topo) * altura
  const caminho = (valores: [number, number][]) =>
    valores.map(([h, v], i) => `${i ? 'L' : 'M'}${x(h)},${y(v)}`).join(' ')

  const tipico = caminho(pontos.map((p) => [p.hora, p.tipico]))
  const pontosHoje = pontos.filter((p) => p.hoje !== null) as (PontoRitmo & { hoje: number })[]
  const hoje = caminho(pontosHoje.map((p) => [p.hora, p.hoje]))
  const areaHoje = pontosHoje.length
    ? `${hoje} L${x(pontosHoje[pontosHoje.length - 1].hora)},${y(0)} L${x(0)},${y(0)} Z`
    : ''
  const ultimoHoje = pontosHoje[pontosHoje.length - 1]
  const ponto = ativo === null ? null : pontos[ativo]

  function aoMover(evento: PointerEvent<SVGRectElement>) {
    const caixa = evento.currentTarget.getBoundingClientRect()
    const hora = Math.round(((evento.clientX - caixa.left) / caixa.width) * 23)
    setAtivo(Math.min(Math.max(hora, 0), 23))
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded" style={{ backgroundColor: COR_HOJE }} /> Hoje
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded" style={{ backgroundColor: COR_TIPICO }} /> Dia típico
          (média das últimas 4 semanas)
        </span>
      </div>
      <div className="relative" ref={ref}>
        {largura > 0 && (
          <svg
            aria-label="Faturamento acumulado por hora: hoje comparado a um dia típico"
            height={topoPlot + altura + 26}
            role="img"
            width={largura}
          >
            <defs>
              <linearGradient id="area-hoje" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={COR_HOJE} stopOpacity={0.18} />
                <stop offset="100%" stopColor={COR_HOJE} stopOpacity={0} />
              </linearGradient>
            </defs>
            {Array.from({ length: 5 }, (_, i) => i * passo).map((tick) => (
              <g key={tick}>
                <line
                  stroke={COR_GRADE}
                  x1={esquerda}
                  x2={esquerda + larguraPlot}
                  y1={y(tick)}
                  y2={y(tick)}
                />
                <text
                  className="tabular-nums"
                  fill={COR_TEXTO_EIXO}
                  fontSize={11}
                  textAnchor="end"
                  x={esquerda - 8}
                  y={y(tick) + 4}
                >
                  {moedaCompacta.format(tick)}
                </text>
              </g>
            ))}
            {[0, 3, 6, 9, 12, 15, 18, 21].map((hora) => (
              <text
                fill={COR_TEXTO_EIXO}
                fontSize={11}
                key={hora}
                textAnchor="middle"
                x={x(hora)}
                y={topoPlot + altura + 18}
              >
                {hora}h
              </text>
            ))}

            <line stroke="#cbd5e1" x1={x(horaAtual)} x2={x(horaAtual)} y1={topoPlot} y2={y(0)} />
            <text
              fill={COR_TEXTO_EIXO}
              fontSize={10}
              textAnchor="middle"
              x={x(horaAtual)}
              y={topoPlot - 1}
            >
              agora
            </text>

            <path
              d={tipico}
              fill="none"
              stroke={COR_TIPICO}
              strokeLinejoin="round"
              strokeWidth={2}
            />
            <path d={areaHoje} fill="url(#area-hoje)" />
            <path d={hoje} fill="none" stroke={COR_HOJE} strokeLinejoin="round" strokeWidth={2} />

            {ultimoHoje && (
              <>
                <circle
                  cx={x(ultimoHoje.hora)}
                  cy={y(ultimoHoje.hoje)}
                  fill={COR_HOJE}
                  r={4}
                  stroke="#fff"
                  strokeWidth={2}
                />
                <text
                  fill="#0f172a"
                  fontSize={11}
                  fontWeight={600}
                  x={x(ultimoHoje.hora) + 8}
                  y={y(ultimoHoje.hoje) - 6}
                >
                  {moedaCompacta.format(ultimoHoje.hoje)}
                </text>
              </>
            )}
            <text fill={COR_TEXTO_EIXO} fontSize={11} x={x(23) + 6} y={y(pontos[23].tipico) + 4}>
              {moedaCompacta.format(pontos[23].tipico)}
            </text>

            {ponto && ativo !== null && (
              <>
                <line stroke="#94a3b8" x1={x(ativo)} x2={x(ativo)} y1={topoPlot} y2={y(0)} />
                <circle
                  cx={x(ativo)}
                  cy={y(ponto.tipico)}
                  fill={COR_TIPICO}
                  r={4}
                  stroke="#fff"
                  strokeWidth={2}
                />
                {ponto.hoje !== null && (
                  <circle
                    cx={x(ativo)}
                    cy={y(ponto.hoje)}
                    fill={COR_HOJE}
                    r={4}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                )}
              </>
            )}
            <rect
              fill="transparent"
              height={altura + topoPlot}
              onPointerLeave={() => setAtivo(null)}
              onPointerMove={aoMover}
              width={larguraPlot}
              x={esquerda}
              y={0}
            />
          </svg>
        )}
        {ponto && ativo !== null && (
          <div
            className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-background px-3 py-2 text-xs shadow-lg"
            role="status"
            style={{ left: Math.min(Math.max(x(ativo), 90), largura - 90) }}
          >
            <p className="mb-1 font-medium text-[#00305c]">Até as {ativo}h59</p>
            <p className="flex justify-between gap-4">
              <span className="text-muted-foreground">Hoje</span>
              <span className="font-semibold tabular-nums">
                {ponto.hoje === null ? '—' : moeda.format(ponto.hoje)}
              </span>
            </p>
            <p className="flex justify-between gap-4">
              <span className="text-muted-foreground">Dia típico</span>
              <span className="font-semibold tabular-nums">{moeda.format(ponto.tipico)}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// --- Meta do mês ------------------------------------------------------------------------------

export function AnelMeta({ fracao, fracaoEsperada }: { fracao: number; fracaoEsperada: number }) {
  const tamanho = 148
  const espessura = 12
  const raio = (tamanho - espessura) / 2
  const circunferencia = 2 * Math.PI * raio
  const angulo = Math.min(fracaoEsperada, 1) * 2 * Math.PI - Math.PI / 2
  const centro = tamanho / 2
  return (
    <svg aria-hidden="true" height={tamanho} width={tamanho}>
      <circle
        cx={centro}
        cy={centro}
        fill="none"
        r={raio}
        stroke="#e2e8f0"
        strokeWidth={espessura}
      />
      <circle
        cx={centro}
        cy={centro}
        fill="none"
        r={raio}
        stroke="#005DAA"
        strokeDasharray={`${Math.min(fracao, 1) * circunferencia} ${circunferencia}`}
        strokeLinecap="round"
        strokeWidth={espessura}
        transform={`rotate(-90 ${centro} ${centro})`}
      />
      {/* marcador de onde o mês "deveria" estar num ritmo linear */}
      <line
        stroke="#00305c"
        strokeLinecap="round"
        strokeWidth={3}
        x1={centro + (raio - espessura / 2 - 3) * Math.cos(angulo)}
        x2={centro + (raio + espessura / 2 + 3) * Math.cos(angulo)}
        y1={centro + (raio - espessura / 2 - 3) * Math.sin(angulo)}
        y2={centro + (raio + espessura / 2 + 3) * Math.sin(angulo)}
      />
    </svg>
  )
}

export function EditorMeta({ meta, onSalvar }: { meta: number; onSalvar: (meta: number) => void }) {
  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState('')

  if (!editando) {
    return (
      <button
        className="inline-flex items-center gap-1 text-xs font-medium text-[#005DAA] hover:underline"
        onClick={() => {
          setRascunho(String(Math.round(meta)))
          setEditando(true)
        }}
        type="button"
      >
        <PencilSquareIcon className="h-3.5 w-3.5" />
        Editar meta
      </button>
    )
  }
  return (
    <form
      className="flex items-center gap-1.5"
      onSubmit={(evento) => {
        evento.preventDefault()
        const valor = Number(rascunho.replace(/\./g, '').replace(',', '.'))
        if (valor > 0) onSalvar(valor)
        setEditando(false)
      }}
    >
      <span className="text-xs text-muted-foreground">R$</span>
      <input
        aria-label="Meta de faturamento do mês"
        autoFocus
        className="h-7 w-24 rounded-md border border-border px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA]"
        inputMode="decimal"
        onChange={(evento) => setRascunho(evento.target.value)}
        onKeyDown={(evento) => evento.key === 'Escape' && setEditando(false)}
        value={rascunho}
      />
      <button
        className="rounded-md bg-[#005DAA] px-2 py-1 text-xs font-medium text-white hover:bg-[#00497f]"
        type="submit"
      >
        Salvar
      </button>
    </form>
  )
}

// --- Pendências -------------------------------------------------------------------------------

export function ListaPendencias({ itens }: { itens: Pendencia[] }) {
  if (itens.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
        <CheckCircleIcon className="h-10 w-10 text-[#1f5c0a]" />
        <p className="text-sm font-medium text-[#00305c]">Tudo em dia!</p>
        <p className="text-xs text-muted-foreground">Nenhuma pendência na sua operação.</p>
      </div>
    )
  }
  return (
    <ul className="flex flex-col gap-2.5">
      {itens.map((item) => {
        const critica = item.gravidade === 'critica'
        return (
          <li key={item.chave}>
            <Link
              className={cn(
                'group flex items-center gap-3 rounded-lg border p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA]',
                critica
                  ? 'border-red-200 bg-red-50/60 hover:bg-red-50'
                  : 'border-amber-200 bg-amber-50/60 hover:bg-amber-50',
              )}
              to={item.rota}
            >
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                  critica ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800',
                )}
              >
                {item.quantidade}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-sm font-medium text-[#00305c]">
                  {critica && (
                    <ExclamationTriangleIcon
                      aria-label="Urgente"
                      className="h-4 w-4 text-red-700"
                    />
                  )}
                  {item.titulo}
                </span>
                {item.descricao && (
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {item.descricao}
                  </span>
                )}
              </span>
              <span className="hidden shrink-0 items-center text-xs font-medium text-[#005DAA] group-hover:underline sm:flex">
                {item.acao}
                <ChevronRightIcon className="h-3.5 w-3.5" />
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

// --- Mapa de calor ----------------------------------------------------------------------------

// rampa sequencial de um só tom (azul), do claro ao escuro
const RAMPA = ['#cde2fb', '#9ec5f4', '#6da7ec', '#2a78d6', '#1c5cab']

export function MapaDeCalor({ matriz }: { matriz: number[][] }) {
  const maximo = Math.max(...matriz.flat(), 0)
  const cor = (valor: number) =>
    valor === 0 || maximo === 0
      ? '#f1f5f9'
      : RAMPA[Math.min(Math.floor((valor / maximo) * RAMPA.length), RAMPA.length - 1)]

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-[3px] text-xs">
          <thead>
            <tr>
              <th className="w-9" />
              {HORAS_MAPA.map((hora) => (
                <th className="font-normal text-muted-foreground" key={hora} scope="col">
                  {hora % 2 === 0 ? `${hora}h` : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matriz.map((linha, dia) => (
              <tr key={DIAS_MAPA[dia]}>
                <th className="pr-1 text-left font-normal text-muted-foreground" scope="row">
                  {DIAS_MAPA[dia]}
                </th>
                {linha.map((valor, coluna) => (
                  <td
                    aria-label={`${DIAS_MAPA[dia]}, ${HORAS_MAPA[coluna]}h: ${valor} pedidos`}
                    className="h-6 min-w-[18px] rounded-[4px] transition-transform hover:scale-110 hover:ring-2 hover:ring-[#00305c]"
                    key={coluna}
                    style={{ backgroundColor: cor(valor) }}
                    title={`${DIAS_MAPA[dia]}, ${HORAS_MAPA[coluna]}h: ${inteiro.format(valor)} pedidos`}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
        Menos
        {['#f1f5f9', ...RAMPA].map((c) => (
          <span className="h-3 w-3 rounded-[3px]" key={c} style={{ backgroundColor: c }} />
        ))}
        Mais
      </div>
    </div>
  )
}

// --- Produto destaque -----------------------------------------------------------------------------

export function ProdutoDestaque({
  produto,
  serie,
  semana,
  anterior,
}: {
  produto: Produto
  serie: number[]
  semana: number
  anterior: number
}) {
  const maximo = Math.max(...serie, 1)
  const variacao = anterior > 0 ? (semana - anterior) / anterior : null
  return (
    <Link
      className="group flex flex-1 flex-col gap-4 focus-visible:outline-none"
      to={`/catalogo/${encodeURIComponent(produto.id)}`}
    >
      <div className="flex gap-4">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-lg border border-border bg-white">
          <img
            alt=""
            className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
            src={produto.foto}
          />
          <span className="absolute left-1.5 top-1.5 rounded bg-[#85FA51] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#00305c]">
            Top 1
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[#005DAA]">{produto.categoria}</p>
          <p className="line-clamp-2 text-sm font-medium text-foreground group-hover:text-[#005DAA] group-hover:underline">
            {produto.nome}
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#00305c]">
            {inteiro.format(semana)}{' '}
            <span className="text-sm font-normal text-muted-foreground">un. em 7 dias</span>
          </p>
          {variacao !== null && (
            <p
              className={cn(
                'text-xs font-medium',
                variacao >= 0 ? 'text-[#1f5c0a]' : 'text-red-700',
              )}
            >
              {variacao >= 0 ? '▲' : '▼'} {percentual.format(Math.abs(variacao))} vs. semana
              anterior
            </p>
          )}
        </div>
      </div>
      <div>
        <div
          aria-label="Unidades vendidas por dia nos últimos 14 dias"
          className="flex h-14 items-end gap-1"
          role="img"
        >
          {serie.map((valor, i) => (
            <div
              className="flex-1 rounded-t-[3px]"
              key={i}
              style={{
                backgroundColor: i >= 7 ? '#005DAA' : '#b7d3f6',
                height: `${Math.max((valor / maximo) * 100, valor > 0 ? 6 : 2)}%`,
              }}
              title={`${valor} un.`}
            />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
          <span>Semana anterior</span>
          <span>Esta semana</span>
        </div>
      </div>
      <p className="mt-auto text-xs text-muted-foreground">
        {moeda.format(semana * produto.preco)} faturados · {produto.estoque} un. em estoque
      </p>
    </Link>
  )
}

// --- Feed de atividade -------------------------------------------------------------------------------

const EVENTOS = {
  venda: { icone: ShoppingBagIcon, texto: 'Nova venda', cor: 'bg-[#005DAA]/10 text-[#005DAA]' },
  envio: { icone: TruckIcon, texto: 'Pedido enviado', cor: 'bg-[#85FA51]/25 text-[#1f5c0a]' },
  devolucao: { icone: ArrowUturnLeftIcon, texto: 'Devolução', cor: 'bg-amber-100 text-amber-800' },
  cancelamento: { icone: XCircleIcon, texto: 'Venda cancelada', cor: 'bg-red-100 text-red-800' },
}

function tempoRelativo(data: Date, agora: Date) {
  const minutos = Math.round((data.getTime() - agora.getTime()) / 60_000)
  if (Math.abs(minutos) < 60) return relativo.format(minutos, 'minute')
  const horas = Math.round(minutos / 60)
  if (Math.abs(horas) < 24) return relativo.format(horas, 'hour')
  return relativo.format(Math.round(horas / 24), 'day')
}

export function FeedAtividade({ eventos, agora }: { eventos: EventoFeed[]; agora: Date }) {
  return (
    <ol className="relative flex flex-col">
      {eventos.map((evento, i) => {
        const { icone: Icone, texto, cor } = EVENTOS[evento.tipo]
        const { venda } = evento
        return (
          <li className="relative flex gap-3 pb-4 last:pb-0" key={evento.chave}>
            {i < eventos.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute left-4 top-9 h-[calc(100%-2.25rem)] w-px bg-border"
              />
            )}
            <span
              className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', cor)}
            >
              <Icone className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                <span className="font-medium text-[#00305c]">
                  {texto}
                  {venda.real && (
                    <span className="ml-2 rounded bg-[#005DAA] px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase text-white">
                      Real
                    </span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  {tempoRelativo(evento.data, agora)}
                </span>
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {venda.itens[0]?.titulo} · {venda.canal} ·{' '}
                <span className="font-medium text-foreground">{moeda.format(venda.total)}</span>
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
