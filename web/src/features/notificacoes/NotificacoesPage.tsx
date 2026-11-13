import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BellSlashIcon, CheckCircleIcon, CheckIcon } from '@heroicons/react/24/outline'

import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'

import { ItemNotificacao } from './componentes'
import { CATEGORIAS, useNotificacoes, type Categoria, type Notificacao } from './dados'
import { ICONES } from './icones'

const DIA_MS = 86_400_000

function grupoDaData(data: Date, hoje: Date) {
  const inicioHoje = new Date(hoje)
  inicioHoje.setHours(0, 0, 0, 0)
  if (data >= inicioHoje) return 'Hoje'
  if (data >= new Date(inicioHoje.getTime() - DIA_MS)) return 'Ontem'
  if (data >= new Date(inicioHoje.getTime() - 7 * DIA_MS)) return 'Últimos 7 dias'
  return 'Anteriores'
}

function Interruptor({
  ligado,
  onAlternar,
  rotulo,
}: {
  ligado: boolean
  onAlternar: () => void
  rotulo: string
}) {
  return (
    <button
      aria-checked={ligado}
      aria-label={rotulo}
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA] focus-visible:ring-offset-2',
        ligado ? 'bg-[#005DAA]' : 'bg-muted-foreground/30',
      )}
      onClick={onAlternar}
      role="switch"
      type="button"
    >
      <span
        className={cn(
          'absolute left-0 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
          ligado ? 'translate-x-[18px]' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}

export function NotificacoesPage() {
  const n = useNotificacoes()
  const [params, setParams] = useSearchParams()
  const [somenteNaoLidas, setSomenteNaoLidas] = useState(false)
  const [somenteUrgentes, setSomenteUrgentes] = useState(false)

  const parametro = params.get('categoria')
  const categoria = parametro && parametro in CATEGORIAS ? (parametro as Categoria) : null
  const escolherCategoria = (valor: Categoria | null) =>
    setParams(valor ? { categoria: valor } : {}, { replace: true })

  const filtradas = n.visiveis.filter(
    (item) =>
      (!categoria || item.categoria === categoria) &&
      (!somenteNaoLidas || !n.estaLida(item.id)) &&
      (!somenteUrgentes || item.gravidade === 'critica'),
  )
  const grupos = filtradas.reduce<[string, Notificacao[]][]>((acc, item) => {
    const nome = grupoDaData(item.data, n.hoje)
    const grupo = acc.find(([g]) => g === nome)
    if (grupo) grupo[1].push(item)
    else acc.push([nome, [item]])
    return acc
  }, [])

  const naoLidasDe = (c: Categoria | null) =>
    n.visiveis.filter((item) => (!c || item.categoria === c) && !n.estaLida(item.id)).length
  const naoLidasFiltradas = filtradas.filter((item) => !n.estaLida(item.id))
  const urgentes = n.visiveis.filter(
    (item) => item.gravidade === 'critica' && !n.estaLida(item.id),
  ).length
  const deHoje = n.visiveis.filter((item) => grupoDaData(item.data, n.hoje) === 'Hoje').length

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#00305c]">Notificações</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tudo o que aconteceu nas suas vendas, estoque, anúncios e fornecedores — e o que fazer a
            respeito.
          </p>
        </div>
        <Button
          className="flex items-center gap-2"
          disabled={naoLidasFiltradas.length === 0}
          onClick={() => n.marcarTodasLidas(naoLidasFiltradas.map((item) => item.id))}
          type="button"
          variant="outline"
        >
          <CheckIcon className="h-4 w-4" />
          Marcar {naoLidasFiltradas.length > 0 ? `${naoLidasFiltradas.length} ` : ''}como lidas
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {([null, ...(Object.keys(CATEGORIAS) as Categoria[])] as (Categoria | null)[])
              .filter((c) => !c || !n.silenciada(c))
              .map((c) => {
                const ativo = categoria === c
                const Icone = c ? ICONES[c] : null
                const quantidade = naoLidasDe(c)
                return (
                  <button
                    aria-pressed={ativo}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA]',
                      ativo
                        ? 'border-[#005DAA] bg-[#005DAA] text-white'
                        : 'border-border bg-background hover:bg-[#85FA51]/10',
                    )}
                    key={c ?? 'todas'}
                    onClick={() => escolherCategoria(c)}
                    type="button"
                  >
                    {Icone && <Icone className="h-4 w-4" />}
                    {c ? CATEGORIAS[c] : 'Todas'}
                    {quantidade > 0 && (
                      <span
                        className={cn(
                          'rounded-full px-1.5 text-xs font-semibold',
                          ativo ? 'bg-white text-[#005DAA]' : 'bg-[#005DAA] text-white',
                        )}
                      >
                        {quantidade}
                      </span>
                    )}
                  </button>
                )
              })}
            <span className="ml-auto flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <label className="flex cursor-pointer items-center gap-2">
                <Interruptor
                  ligado={somenteUrgentes}
                  onAlternar={() => setSomenteUrgentes((v) => !v)}
                  rotulo="Somente urgentes"
                />
                Urgentes
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <Interruptor
                  ligado={somenteNaoLidas}
                  onAlternar={() => setSomenteNaoLidas((v) => !v)}
                  rotulo="Somente não lidas"
                />
                Não lidas
              </label>
            </span>
          </div>

          {n.carregando ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Carregando notificações...
            </p>
          ) : grupos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
              <CheckCircleIcon className="h-10 w-10 text-[#1f5c0a]" />
              <p className="text-sm font-medium text-[#00305c]">Nada por aqui</p>
              <p className="text-xs text-muted-foreground">
                {somenteNaoLidas
                  ? 'Você leu todas as notificações deste filtro.'
                  : 'Nenhuma notificação neste filtro.'}
              </p>
            </div>
          ) : (
            grupos.map(([nome, itens]) => (
              <section aria-label={nome} className="flex flex-col gap-2.5" key={nome}>
                <h2 className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {nome} <span className="font-normal">· {itens.length}</span>
                </h2>
                {itens.map((item) => (
                  <ItemNotificacao
                    agora={n.hoje}
                    key={item.id}
                    lida={n.estaLida(item.id)}
                    notificacao={item}
                    onMarcar={(lida) => n.marcarLida(item.id, lida)}
                  />
                ))}
              </section>
            ))
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <Card className="grid grid-cols-3 divide-x divide-border p-0 text-center">
            {[
              { rotulo: 'Não lidas', valor: n.naoLidas, destaque: 'text-[#005DAA]' },
              {
                rotulo: 'Urgentes',
                valor: urgentes,
                destaque: urgentes ? 'text-red-700' : 'text-[#00305c]',
              },
              { rotulo: 'Hoje', valor: deHoje, destaque: 'text-[#00305c]' },
            ].map((item) => (
              <div className="px-2 py-4" key={item.rotulo}>
                <p className={cn('text-2xl font-semibold', item.destaque)}>{item.valor}</p>
                <p className="text-xs text-muted-foreground">{item.rotulo}</p>
              </div>
            ))}
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-semibold text-[#00305c]">Preferências</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Escolha o que você quer acompanhar. Categorias desligadas somem da lista e do sino.
            </p>
            <ul className="mt-4 flex flex-col gap-3">
              {(Object.keys(CATEGORIAS) as Categoria[]).map((c) => {
                const Icone = ICONES[c]
                const total = n.todas.filter((item) => item.categoria === c).length
                return (
                  <li className="flex items-center justify-between gap-3" key={c}>
                    <span className="flex items-center gap-2.5 text-sm">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Icone className="h-4 w-4" />
                      </span>
                      <span>
                        <span className="block text-foreground">{CATEGORIAS[c]}</span>
                        <span className="text-xs text-muted-foreground">{total} no período</span>
                      </span>
                    </span>
                    <Interruptor
                      ligado={!n.silenciada(c)}
                      onAlternar={() => n.alternarCategoria(c)}
                      rotulo={`Notificações de ${CATEGORIAS[c]}`}
                    />
                  </li>
                )
              })}
            </ul>
          </Card>

          <Card className="flex gap-3 p-4 text-xs text-muted-foreground">
            <BellSlashIcon className="h-5 w-5 shrink-0 text-[#005DAA]" />
            <p>
              As notificações são geradas a partir das suas vendas, estoque, anúncios e
              fornecedores. As marcadas com{' '}
              <span className="rounded bg-[#005DAA] px-1 py-0.5 text-[10px] font-semibold uppercase text-white">
                Real
              </span>{' '}
              vêm direto da sua conta do Mercado Livre; as demais usam os dados de demonstração.
            </p>
          </Card>
        </aside>
      </div>
    </section>
  )
}
