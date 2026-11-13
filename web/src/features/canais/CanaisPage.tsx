import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  BellAlertIcon,
  BellIcon,
  CheckBadgeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  Squares2X2Icon,
  TableCellsIcon,
} from '@heroicons/react/24/outline'

import { useAnunciosMercadoLivre } from '@/features/catalogo/produtos'
import { usePedidosMercadoLivre } from '@/features/financeiro/vendas'
import { api } from '@/shared/api/client'
import type { ErroApi } from '@/shared/api/types'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'

import {
  CANAIS,
  ROTULOS_STATUS,
  alternarInteresse,
  useInteresse,
  type Canal,
  type StatusCanal,
} from './canais'

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

// textura de pontos sobre a cor da marca
const PADRAO =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14'%3E%3Ccircle cx='2' cy='2' r='1.1' fill='white' fill-opacity='0.16'/%3E%3C/svg%3E\")"

const ESTILOS_STATUS: Record<StatusCanal, string> = {
  integrado: 'bg-[#85FA51] text-[#00305c]',
  em_breve: 'bg-white text-[#005DAA]',
  planejado: 'bg-white/85 text-muted-foreground',
}

function BannerCanal({
  canal,
  className,
  children,
}: {
  canal: Canal
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div
      className={cn('relative flex items-center justify-center overflow-hidden', className)}
      style={{ backgroundColor: canal.cor, backgroundImage: PADRAO }}
    >
      <div
        aria-hidden="true"
        className="absolute -right-8 -top-10 h-32 w-32 rounded-full opacity-30 blur-2xl"
        style={{ backgroundColor: canal.destaque }}
      />
      <div className="relative flex h-14 w-44 items-center justify-center rounded-xl bg-white px-4 shadow-lg ring-1 ring-black/5">
        <img
          alt={`Logotipo ${canal.nome}`}
          className="max-h-8 max-w-full object-contain"
          src={canal.logo}
        />
      </div>
      {children}
    </div>
  )
}

function useStatusMercadoLivre() {
  return useQuery({
    queryKey: ['canais', 'mercado-livre', 'status'],
    queryFn: async () =>
      (await api.get<{ conectado: boolean }>('/canais/mercado-livre/status')).data,
  })
}

export function CanaisPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  // capturado uma vez: a query string é limpa logo em seguida, mas a mensagem fica
  const [retorno] = useState(() => searchParams.get('mercado_livre'))
  const [conectando, setConectando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<StatusCanal | 'todos'>('todos')
  const [visao, setVisao] = useState<'cards' | 'tabela'>('cards')
  const interesse = useInteresse()

  const status = useStatusMercadoLivre()
  const anuncios = useAnunciosMercadoLivre()
  const pedidos = usePedidosMercadoLivre()
  const conectado = status.data?.conectado ?? false

  useEffect(() => {
    if (retorno) setSearchParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function conectarMercadoLivre() {
    setErro(null)
    setConectando(true)
    try {
      const { data } = await api.get<{ url: string }>('/canais/mercado-livre/conectar')
      window.location.href = data.url
    } catch (erroRequisicao) {
      setErro(
        axios.isAxiosError<ErroApi>(erroRequisicao)
          ? (erroRequisicao.response?.data.mensagem ?? 'Não foi possível iniciar a conexão.')
          : 'Não foi possível iniciar a conexão.',
      )
      setConectando(false)
    }
  }

  const mercadoLivre = CANAIS[0]
  const outros = CANAIS.slice(1).filter((c) => filtro === 'todos' || c.status === filtro)
  const ativos = (anuncios.data ?? []).filter((p) => p.status === 'active').length
  const emRevisao = (anuncios.data ?? []).filter((p) => p.status === 'under_review').length
  const vendasReais = pedidos.data ?? []
  const faturamentoReal = vendasReais.reduce((s, v) => s + v.total, 0)

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#00305c]">Canais de venda</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Conecte seus marketplaces e gerencie tudo em um só lugar.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            rotulo: 'Canais conectados',
            valor: `${conectado ? 1 : 0} de ${CANAIS.length}`,
            icone: LinkIcon,
          },
          {
            rotulo: 'Anúncios sincronizados',
            valor: String(anuncios.data?.length ?? 0),
            icone: Squares2X2Icon,
          },
          {
            rotulo: 'Vendas reais importadas',
            valor: `${vendasReais.length} · ${moeda.format(faturamentoReal)}`,
            icone: CheckBadgeIcon,
          },
          {
            rotulo: 'Canais na sua lista de interesse',
            valor: String(interesse.size),
            icone: BellAlertIcon,
          },
        ].map(({ rotulo, valor, icone: Icone }) => (
          <Card className="flex items-center gap-4 p-5" key={rotulo}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#005DAA]/10 text-[#005DAA]">
              <Icone className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-xs text-muted-foreground">{rotulo}</span>
              <span className="text-lg font-semibold text-[#00305c]">{valor}</span>
            </span>
          </Card>
        ))}
      </div>

      {/* Canal principal: Mercado Livre */}
      <Card className="overflow-hidden">
        <div className="grid lg:grid-cols-[340px_minmax(0,1fr)]">
          <BannerCanal canal={mercadoLivre} className="h-44 lg:h-auto">
            <span
              className={cn(
                'absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                conectado ? 'bg-[#00305c] text-[#85FA51]' : 'bg-white text-red-700',
              )}
            >
              <span
                className={cn('h-2 w-2 rounded-full', conectado ? 'bg-[#85FA51]' : 'bg-red-500')}
              />
              {status.isPending ? 'Verificando...' : conectado ? 'Conectado' : 'Desconectado'}
            </span>
          </BannerCanal>
          <div className="flex flex-col gap-4 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-[#00305c]">{mercadoLivre.nome}</h2>
                <p className="text-sm text-muted-foreground">{mercadoLivre.slogan}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {conectado ? (
                  <>
                    <Link
                      className="inline-flex h-9 items-center gap-2 rounded-md bg-[#005DAA] px-3 text-sm font-medium text-white hover:bg-[#00497f]"
                      to="/catalogo"
                    >
                      <Squares2X2Icon className="h-4 w-4" /> Ver anúncios
                    </Link>
                    <Link
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted"
                      to="/pedidos?periodo=tudo"
                    >
                      Ver pedidos
                    </Link>
                    <Button
                      className="flex items-center gap-2"
                      disabled={conectando}
                      onClick={conectarMercadoLivre}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <ArrowPathIcon className="h-4 w-4" />
                      {conectando ? 'Redirecionando...' : 'Reconectar'}
                    </Button>
                  </>
                ) : (
                  <Button
                    className="bg-[#005DAA] text-white hover:bg-[#00497f]"
                    disabled={conectando || status.isPending}
                    onClick={conectarMercadoLivre}
                    type="button"
                  >
                    {conectando ? 'Redirecionando...' : 'Conectar Mercado Livre'}
                  </Button>
                )}
              </div>
            </div>

            {retorno === 'conectado' && (
              <p className="flex items-center gap-2 rounded-md bg-[#85FA51]/20 px-3 py-2 text-sm text-[#1f5c0a]">
                <CheckCircleIcon className="h-5 w-5" /> Conta do Mercado Livre conectada com
                sucesso.
              </p>
            )}
            {(retorno === 'erro' || erro) && (
              <p className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
                <ExclamationTriangleIcon className="h-5 w-5" />
                {erro ?? 'Não foi possível conectar sua conta do Mercado Livre. Tente novamente.'}
              </p>
            )}
            {retorno === 'conta_em_uso' && (
              <p className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
                <ExclamationTriangleIcon className="h-5 w-5" />
                Essa conta do Mercado Livre já está conectada a outro vendedor.
              </p>
            )}

            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Anúncios ativos', conectado ? String(ativos) : '—'],
                ['Em revisão', conectado ? String(emRevisao) : '—'],
                ['Pedidos importados', conectado ? String(vendasReais.length) : '—'],
                ['Comissão de referência', mercadoLivre.comissao],
              ].map(([rotulo, valor]) => (
                <div className="rounded-lg bg-muted/50 p-3" key={rotulo}>
                  <dt className="text-xs text-muted-foreground">{rotulo}</dt>
                  <dd
                    className={cn(
                      'mt-0.5 font-semibold text-[#00305c]',
                      valor.length > 6 ? 'text-sm' : 'text-lg',
                    )}
                  >
                    {valor}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span>
                <span className="font-medium text-foreground">Logística:</span>{' '}
                {mercadoLivre.logistica}
              </span>
              <span>
                <span className="font-medium text-foreground">O que sincroniza:</span> anúncios,
                estoque, fotos e pedidos
              </span>
              {mercadoLivre.site && (
                <a
                  className="inline-flex items-center gap-1 font-medium text-[#005DAA] hover:underline"
                  href={mercadoLivre.site}
                  rel="noreferrer"
                  target="_blank"
                >
                  Central do vendedor <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Outros marketplaces */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#00305c]">Outros marketplaces</h2>
          <p className="text-sm text-muted-foreground">
            Integrações a caminho. Clique em <strong>Avise-me</strong> para entrar na lista de
            interesse de cada canal.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(['todos', 'em_breve', 'planejado'] as const).map((valor) => (
            <button
              aria-pressed={filtro === valor}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA]',
                filtro === valor
                  ? 'border-[#005DAA] bg-[#005DAA] text-white'
                  : 'border-border bg-background hover:bg-[#85FA51]/10',
              )}
              key={valor}
              onClick={() => setFiltro(valor)}
              type="button"
            >
              {valor === 'todos' ? 'Todos' : ROTULOS_STATUS[valor]}
            </button>
          ))}
          <div
            aria-label="Modo de visualização"
            className="ml-1 flex rounded-md border border-border bg-background p-0.5"
            role="group"
          >
            {(
              [
                ['cards', 'Ver em cards', Squares2X2Icon],
                ['tabela', 'Comparar em tabela', TableCellsIcon],
              ] as const
            ).map(([valor, rotulo, Icone]) => (
              <button
                aria-label={rotulo}
                aria-pressed={visao === valor}
                className={cn(
                  'rounded p-1.5',
                  visao === valor
                    ? 'bg-[#005DAA] text-white'
                    : 'text-muted-foreground hover:bg-[#85FA51]/10',
                )}
                key={valor}
                onClick={() => setVisao(valor)}
                title={rotulo}
                type="button"
              >
                <Icone className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {visao === 'cards' ? (
        <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {outros.map((canal) => {
            const avisar = interesse.has(canal.id)
            return (
              <li key={canal.id}>
                <Card className="flex h-full flex-col overflow-hidden transition-shadow hover:shadow-lg">
                  <BannerCanal canal={canal} className="h-32">
                    <span
                      className={cn(
                        'absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm',
                        ESTILOS_STATUS[canal.status],
                      )}
                    >
                      {ROTULOS_STATUS[canal.status]}
                    </span>
                  </BannerCanal>
                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <div>
                      <h3 className="text-base font-semibold text-[#00305c]">{canal.nome}</h3>
                      <p className="text-xs font-medium text-[#005DAA]">{canal.slogan}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{canal.descricao}</p>
                    <dl className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-md bg-muted/50 p-2.5">
                        <dt className="text-muted-foreground">Comissão de referência</dt>
                        <dd className="mt-0.5 font-semibold text-[#00305c]">{canal.comissao}</dd>
                      </div>
                      <div className="rounded-md bg-muted/50 p-2.5">
                        <dt className="text-muted-foreground">Logística</dt>
                        <dd className="mt-0.5 font-semibold text-[#00305c]">{canal.logistica}</dd>
                      </div>
                    </dl>
                    <div className="flex flex-wrap gap-1.5">
                      {canal.pontosFortes.map((ponto) => (
                        <span
                          className="rounded-full bg-[#005DAA]/10 px-2 py-0.5 text-[11px] font-medium text-[#005DAA]"
                          key={ponto}
                        >
                          {ponto}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Para vender:</span>{' '}
                      {canal.requisitos.join(' · ')}
                    </p>
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
                      <button
                        aria-pressed={avisar}
                        className={cn(
                          'inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA]',
                          avisar
                            ? 'bg-[#85FA51] text-[#00305c] hover:bg-[#6fe03c]'
                            : 'border border-border bg-background hover:bg-muted',
                        )}
                        onClick={() => alternarInteresse(canal.id)}
                        type="button"
                      >
                        {avisar ? (
                          <BellAlertIcon className="h-4 w-4" />
                        ) : (
                          <BellIcon className="h-4 w-4" />
                        )}
                        {avisar ? 'Você será avisado' : 'Avise-me'}
                      </button>
                      {canal.site && (
                        <a
                          className="inline-flex items-center gap-1 text-sm font-medium text-[#005DAA] hover:underline"
                          href={canal.site}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Saiba mais <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-border bg-[#005DAA]/5 text-xs font-semibold uppercase tracking-wide text-[#005DAA]">
                <tr>
                  <th className="px-5 py-3">Canal</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Comissão de referência</th>
                  <th className="px-3 py-3">Logística</th>
                  <th className="px-3 py-3">Público</th>
                  <th className="px-5 py-3">Requisitos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[mercadoLivre, ...outros].map((canal) => (
                  <tr className="hover:bg-[#85FA51]/10" key={canal.id}>
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-3">
                        <span className="flex h-9 w-20 items-center justify-center rounded-md border border-border bg-white px-2">
                          <img
                            alt=""
                            className="max-h-5 max-w-full object-contain"
                            src={canal.logo}
                          />
                        </span>
                        <span className="font-medium text-[#00305c]">{canal.nome}</span>
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          'whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium',
                          canal.status === 'integrado'
                            ? conectado
                              ? 'bg-[#85FA51]/25 text-[#1f5c0a]'
                              : 'bg-red-100 text-red-800'
                            : canal.status === 'em_breve'
                              ? 'bg-[#005DAA]/10 text-[#005DAA]'
                              : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {canal.status === 'integrado'
                          ? conectado
                            ? 'Conectado'
                            : 'Desconectado'
                          : ROTULOS_STATUS[canal.status]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">{canal.comissao}</td>
                    <td className="px-3 py-3 text-muted-foreground">{canal.logistica}</td>
                    <td className="px-3 py-3 text-muted-foreground">{canal.publico}</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {canal.requisitos.join(' · ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Comissões e informações de logística são valores de referência aproximados e mudam com
        frequência — confirme as condições atuais no site de cada marketplace antes de começar a
        vender. Logotipos pertencem aos seus respectivos donos e são usados apenas para identificar
        cada canal.
      </p>
    </section>
  )
}
