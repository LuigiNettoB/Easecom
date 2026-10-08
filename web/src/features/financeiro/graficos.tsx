import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

import { cn } from '@/shared/lib/cn'

import type { Fatia } from './metricas'

// Paleta categórica validada (scripts/validate_palette.js da skill de dataviz):
// azul da marca no slot 1; ordem fixa, nunca reciclada. Três cores ficam abaixo
// de 3:1 sobre o branco, então toda fatia leva rótulo visível com valor.
const CORES_CATEGORIAS = ['#005DAA', '#eb6834', '#1baf7a', '#eda100', '#e87ba4']
const COR_OUTROS = '#a3a29c'
const COR_SERIE = '#005DAA'
const COR_GRADE = '#e5e7eb'
const COR_EIXO = '#cbd5e1'
const COR_TEXTO_EIXO = '#64748b'

function useLargura<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [largura, setLargura] = useState(0)
  useLayoutEffect(() => {
    if (!ref.current) return
    // mede já na montagem: o ResizeObserver só notifica no próximo quadro desenhado
    setLargura(ref.current.getBoundingClientRect().width)
    const observador = new ResizeObserver(([entrada]) => setLargura(entrada.contentRect.width))
    observador.observe(ref.current)
    return () => observador.disconnect()
  }, [])
  return [ref, largura] as const
}

function escalaBonita(maximo: number, divisoes = 4) {
  if (maximo <= 0) return { topo: divisoes, passo: 1 }
  const bruto = maximo / divisoes
  const magnitude = 10 ** Math.floor(Math.log10(bruto))
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((p) => p >= bruto)!
  return { topo: passo * divisoes, passo }
}

// Curva monotônica (Fritsch–Carlson): suaviza sem "inventar" picos entre os pontos.
function caminhoMonotonico(pontos: [number, number][]) {
  if (pontos.length < 2) return pontos.length ? `M${pontos[0][0]},${pontos[0][1]}` : ''
  const n = pontos.length
  const dx = pontos.slice(1).map(([x], i) => x - pontos[i][0])
  const inclinacoes = pontos.slice(1).map(([, y], i) => (y - pontos[i][1]) / dx[i])
  const tangentes = pontos.map((_, i) => {
    if (i === 0) return inclinacoes[0]
    if (i === n - 1) return inclinacoes[n - 2]
    const a = inclinacoes[i - 1]
    const b = inclinacoes[i]
    return a * b <= 0 ? 0 : (3 * (a + b)) / (2 / a + 1 / b + (1 / a + 2 / b))
  })
  let d = `M${pontos[0][0]},${pontos[0][1]}`
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pontos[i]
    const [x1, y1] = pontos[i + 1]
    const h = dx[i] / 3
    d += ` C${x0 + h},${y0 + tangentes[i] * h} ${x1 - h},${y1 - tangentes[i + 1] * h} ${x1},${y1}`
  }
  return d
}

type PontoGrafico = { rotulo: string; rotuloCompleto: string; valor: number }

type GraficoTemporalProps = {
  pontos: PontoGrafico[]
  tipo: 'area' | 'colunas'
  formatarValor: (valor: number) => string
  formatarEixo: (valor: number) => string
  nomeMetrica: string
}

const ALTURA_PLOT = 280
const FAIXA_EIXO_X = 28
const MARGEM_ESQUERDA = 56
const MARGEM_DIREITA = 12
const MARGEM_TOPO = 12

export function GraficoTemporal({
  pontos,
  tipo,
  formatarValor,
  formatarEixo,
  nomeMetrica,
}: GraficoTemporalProps) {
  const [ref, largura] = useLargura<HTMLDivElement>()
  const [ativo, setAtivo] = useState<number | null>(null)

  const larguraPlot = Math.max(largura - MARGEM_ESQUERDA - MARGEM_DIREITA, 0)
  const { topo, passo } = escalaBonita(Math.max(...pontos.map((p) => p.valor), 0))
  const ticks = Array.from({ length: Math.round(topo / passo) + 1 }, (_, i) => i * passo)
  const y = (valor: number) => MARGEM_TOPO + ALTURA_PLOT - (valor / topo) * ALTURA_PLOT
  const banda = pontos.length ? larguraPlot / pontos.length : 0
  const x = (i: number) =>
    MARGEM_ESQUERDA +
    (tipo === 'colunas' || pontos.length === 1
      ? banda * (i + 0.5)
      : (i / (pontos.length - 1)) * larguraPlot)
  const coordenadas = pontos.map((p, i) => [x(i), y(p.valor)] as [number, number])
  const linha = caminhoMonotonico(coordenadas)
  const base = y(0)
  const area = coordenadas.length
    ? `${linha} L${coordenadas[coordenadas.length - 1][0]},${base} L${coordenadas[0][0]},${base} Z`
    : ''
  // rótulos do eixo x sem sobreposição: pula de n em n quando aperta
  const saltoRotulo = Math.max(1, Math.ceil(46 / Math.max(banda, 1)))

  function aoMoverPonteiro(evento: PointerEvent<SVGRectElement>) {
    const caixa = evento.currentTarget.getBoundingClientRect()
    const posicao = evento.clientX - caixa.left
    const indice =
      tipo === 'colunas' || pontos.length === 1
        ? Math.floor(posicao / banda)
        : Math.round((posicao / larguraPlot) * (pontos.length - 1))
    setAtivo(Math.min(Math.max(indice, 0), pontos.length - 1))
  }

  function aoPressionarTecla(evento: KeyboardEvent<SVGSVGElement>) {
    if (evento.key === 'ArrowRight' || evento.key === 'ArrowLeft') {
      evento.preventDefault()
      const delta = evento.key === 'ArrowRight' ? 1 : -1
      setAtivo((atual) =>
        Math.min(
          Math.max((atual ?? (delta > 0 ? -1 : pontos.length)) + delta, 0),
          pontos.length - 1,
        ),
      )
    } else if (evento.key === 'Escape') {
      setAtivo(null)
    }
  }

  const pontoAtivo = ativo === null ? null : pontos[ativo]
  const larguraColuna = Math.min(44, banda * 0.6)

  return (
    <div className="relative" ref={ref}>
      {largura > 0 && (
        <svg
          aria-label={`${nomeMetrica} por período. Use as setas para percorrer os valores.`}
          className="block select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA] focus-visible:ring-offset-2"
          height={MARGEM_TOPO + ALTURA_PLOT + FAIXA_EIXO_X}
          onBlur={() => setAtivo(null)}
          onKeyDown={aoPressionarTecla}
          role="img"
          tabIndex={0}
          width={largura}
        >
          <defs>
            <linearGradient id="preenchimento-volume" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={COR_SERIE} stopOpacity={0.22} />
              <stop offset="100%" stopColor={COR_SERIE} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          {ticks.map((tick) => (
            <g key={tick}>
              <line
                stroke={tick === 0 ? COR_EIXO : COR_GRADE}
                strokeWidth={1}
                x1={MARGEM_ESQUERDA}
                x2={MARGEM_ESQUERDA + larguraPlot}
                y1={y(tick)}
                y2={y(tick)}
              />
              <text
                className="tabular-nums"
                fill={COR_TEXTO_EIXO}
                fontSize={11}
                textAnchor="end"
                x={MARGEM_ESQUERDA - 8}
                y={y(tick) + 4}
              >
                {formatarEixo(tick)}
              </text>
            </g>
          ))}

          {pontos.map((ponto, i) =>
            i % saltoRotulo === 0 || i === pontos.length - 1 ? (
              <text
                fill={ativo === i ? '#0f172a' : COR_TEXTO_EIXO}
                fontSize={11}
                fontWeight={ativo === i ? 600 : 400}
                key={ponto.rotulo + i}
                textAnchor="middle"
                x={x(i)}
                y={MARGEM_TOPO + ALTURA_PLOT + 18}
              >
                {ponto.rotulo}
              </text>
            ) : null,
          )}

          {tipo === 'area' ? (
            <>
              <path d={area} fill="url(#preenchimento-volume)" />
              <path
                d={linha}
                fill="none"
                stroke={COR_SERIE}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
              {pontoAtivo && ativo !== null && (
                <>
                  <line
                    stroke={COR_EIXO}
                    strokeWidth={1}
                    x1={x(ativo)}
                    x2={x(ativo)}
                    y1={MARGEM_TOPO}
                    y2={base}
                  />
                  <circle
                    cx={x(ativo)}
                    cy={y(pontoAtivo.valor)}
                    fill={COR_SERIE}
                    r={5}
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                </>
              )}
            </>
          ) : (
            pontos.map((ponto, i) => {
              const altura = Math.max(base - y(ponto.valor), ponto.valor > 0 ? 2 : 0)
              const raio = Math.min(4, altura, larguraColuna / 2)
              const esquerda = x(i) - larguraColuna / 2
              const topoBarra = base - altura
              return (
                <path
                  d={`M${esquerda},${base} V${topoBarra + raio} Q${esquerda},${topoBarra} ${esquerda + raio},${topoBarra} H${esquerda + larguraColuna - raio} Q${esquerda + larguraColuna},${topoBarra} ${esquerda + larguraColuna},${topoBarra + raio} V${base} Z`}
                  fill={COR_SERIE}
                  key={ponto.rotulo + i}
                  opacity={ativo === null || ativo === i ? 1 : 0.55}
                />
              )
            })
          )}

          <rect
            fill="transparent"
            height={ALTURA_PLOT + MARGEM_TOPO}
            onPointerLeave={() => setAtivo(null)}
            onPointerMove={aoMoverPonteiro}
            width={larguraPlot}
            x={MARGEM_ESQUERDA}
            y={0}
          />
        </svg>
      )}

      {pontoAtivo && ativo !== null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-border bg-background px-3 py-2 text-center shadow-lg"
          role="status"
          style={{
            left: Math.min(Math.max(x(ativo), 80), largura - 80),
            top: Math.max(y(pontoAtivo.valor) - 10, 48),
          }}
        >
          <p className="text-xs text-muted-foreground">{pontoAtivo.rotuloCompleto}</p>
          <p className="text-sm font-semibold text-[#00305c]">{formatarValor(pontoAtivo.valor)}</p>
        </div>
      )}
    </div>
  )
}

export function Rosca({
  fatias,
  formatarValor,
  rotuloTotal,
}: {
  fatias: Fatia[]
  formatarValor: (valor: number) => string
  rotuloTotal: string
}) {
  const [ativa, setAtiva] = useState<number | null>(null)
  const total = fatias.reduce((soma, fatia) => soma + fatia.valor, 0)
  const tamanho = 184
  const espessura = 26
  const raio = (tamanho - espessura) / 2
  const circunferencia = 2 * Math.PI * raio
  // 2px de "superfície" entre fatias — separa sem precisar de borda
  const vao = fatias.length > 1 ? 2 : 0
  const cor = (fatia: Fatia, i: number) => (fatia.outros ? COR_OUTROS : CORES_CATEGORIAS[i])

  let acumulado = 0
  const destaque = ativa === null ? null : fatias[ativa]

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ height: tamanho, width: tamanho }}>
        <svg
          aria-hidden="true"
          className="-rotate-90"
          height={tamanho}
          viewBox={`0 0 ${tamanho} ${tamanho}`}
          width={tamanho}
        >
          {total > 0 &&
            fatias.map((fatia, i) => {
              const comprimento = (fatia.valor / total) * circunferencia
              const inicio = acumulado
              acumulado += comprimento
              return (
                <circle
                  cx={tamanho / 2}
                  cy={tamanho / 2}
                  fill="none"
                  key={fatia.rotulo}
                  onPointerEnter={() => setAtiva(i)}
                  onPointerLeave={() => setAtiva(null)}
                  opacity={ativa === null || ativa === i ? 1 : 0.35}
                  r={raio}
                  stroke={cor(fatia, i)}
                  strokeDasharray={`${Math.max(comprimento - vao, 0.5)} ${circunferencia}`}
                  strokeDashoffset={-inicio}
                  strokeWidth={ativa === i ? espessura + 4 : espessura}
                  style={{ transition: 'opacity 150ms, stroke-width 150ms' }}
                />
              )
            })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {destaque ? destaque.rotulo : rotuloTotal}
          </p>
          <p className="text-lg font-semibold text-[#00305c]">
            {formatarValor(destaque ? destaque.valor : total)}
          </p>
          {destaque && total > 0 && (
            <p className="text-xs font-medium text-muted-foreground">
              {((destaque.valor / total) * 100).toFixed(1).replace('.', ',')}%
            </p>
          )}
        </div>
      </div>

      <ul className="grid w-full grid-cols-1 gap-x-4 gap-y-1.5 text-xs">
        {fatias.map((fatia, i) => (
          <li
            className={cn(
              'flex items-center justify-between gap-2 rounded px-1 py-0.5 transition-colors',
              ativa === i && 'bg-muted',
            )}
            key={fatia.rotulo}
            onPointerEnter={() => setAtiva(i)}
            onPointerLeave={() => setAtiva(null)}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: cor(fatia, i) }}
              />
              <span className="truncate text-foreground">{fatia.rotulo}</span>
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {total > 0 ? ((fatia.valor / total) * 100).toFixed(1).replace('.', ',') : '0'}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function BarrasHorizontais({
  itens,
  formatarValor,
  detalhe,
}: {
  itens: { rotulo: string; valor: number }[]
  formatarValor: (valor: number) => string
  detalhe?: (item: { rotulo: string; valor: number }, total: number) => string
}) {
  const maximo = Math.max(...itens.map((item) => item.valor), 0)
  const total = itens.reduce((soma, item) => soma + item.valor, 0)

  return (
    <ul className="flex flex-col gap-3.5">
      {itens.map((item) => (
        <li key={item.rotulo}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-foreground">{item.rotulo}</span>
            <span className="shrink-0 text-right">
              <span className="font-semibold tabular-nums text-[#00305c]">
                {formatarValor(item.valor)}
              </span>
              {detalhe && (
                <span className="ml-1.5 text-xs tabular-nums text-muted-foreground">
                  {detalhe(item, total)}
                </span>
              )}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{
                backgroundColor: COR_SERIE,
                width: `${maximo > 0 ? Math.max((item.valor / maximo) * 100, 1) : 0}%`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
