import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  BanknotesIcon,
  InformationCircleIcon,
  LinkIcon,
  ShoppingCartIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline'

import { useVendas } from '@/features/financeiro/vendas'
import { api } from '@/shared/api/client'
import { useAuth } from '@/shared/auth/AuthContext'
import { cn } from '@/shared/lib/cn'
import { Card } from '@/shared/ui/Card'

import {
  DIAS_MAPA,
  feedDeAtividade,
  mapaDeCalor,
  pendencias,
  produtoDestaque,
  resumoDoMes,
  ritmoDoDia,
} from './dados'
import {
  AnelMeta,
  Comparacao,
  EditorMeta,
  FeedAtividade,
  GraficoRitmo,
  LinkPainel,
  ListaPendencias,
  MapaDeCalor,
  Painel,
  ProdutoDestaque,
} from './widgets'
import { moeda, moedaCompacta } from './formatos'

const CHAVE_META = 'easecom.meta-mensal'

function lerMeta() {
  try {
    const valor = Number(localStorage.getItem(CHAVE_META))
    return valor > 0 ? valor : null
  } catch {
    return null
  }
}

function salvarMeta(valor: number) {
  try {
    localStorage.setItem(CHAVE_META, String(valor))
  } catch {
    // sem armazenamento, a meta vale só até recarregar
  }
}

function saudacao(hora: number) {
  if (hora < 5) return 'Boa madrugada'
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

const dataExtensa = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
const primeiraMaiuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1)
const nomeDoDia = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' })
const inteiro = new Intl.NumberFormat('pt-BR')
const percentual = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 })

const ATALHOS = [
  { rota: '/catalogo', rotulo: 'Catálogo', icone: Squares2X2Icon },
  { rota: '/pedidos', rotulo: 'Pedidos', icone: ShoppingCartIcon },
  { rota: '/financeiro', rotulo: 'Financeiro', icone: BanknotesIcon },
  { rota: '/canais', rotulo: 'Canais', icone: LinkIcon },
]

const OUTROS_CANAIS = ['Shopee', 'Amazon', 'Magalu']

export function InicioPage() {
  const { usuario } = useAuth()
  const { hoje, vendas, reais, anuncios, carregando } = useVendas(true)
  const statusMl = useQuery({
    queryKey: ['canais', 'mercado-livre', 'status'],
    queryFn: async () =>
      (await api.get<{ conectado: boolean }>('/canais/mercado-livre/status')).data,
  })
  const [metaSalva, setMetaSalva] = useState(lerMeta)

  const produtos = useMemo(() => anuncios.data ?? [], [anuncios.data])
  const dados = useMemo(
    () => ({
      ritmo: ritmoDoDia(vendas, hoje),
      mes: resumoDoMes(vendas, hoje),
      calor: mapaDeCalor(vendas, hoje),
      pendencias: pendencias(vendas, produtos, hoje),
      feed: feedDeAtividade(vendas),
      destaque: produtoDestaque(vendas, produtos, hoje),
    }),
    [hoje, produtos, vendas],
  )

  const primeiroNome = usuario?.nome.split(' ')[0] ?? ''
  const { ritmo, mes, calor } = dados
  const meta = metaSalva ?? mes.metaSugerida
  const fracaoMeta = meta > 0 ? mes.faturamento / meta : 0
  const noRitmo = mes.projecao >= meta
  const diferencaRitmo =
    ritmo.tipicoAteAgora > 0
      ? (ritmo.faturamentoHoje - ritmo.tipicoAteAgora) / ritmo.tipicoAteAgora
      : null
  const ativos = produtos.filter((p) => p.status === 'active').length
  const emRevisao = produtos.filter((p) => p.status === 'under_review').length
  const ultimaVendaReal = reais[0]?.data

  function definirMeta(valor: number) {
    salvarMeta(valor)
    setMetaSalva(valor)
  }

  if (carregando) {
    return (
      <p className="py-24 text-center text-sm text-muted-foreground">Preparando seu painel...</p>
    )
  }

  return (
    <section className="grid gap-4 xl:grid-cols-12">
      {/* Destaque do dia */}
      <div className="relative overflow-hidden rounded-lg bg-[#00305c] p-6 text-white shadow-sm xl:col-span-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-[#85FA51]/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 right-40 h-64 w-64 rounded-full bg-[#005DAA]/60 blur-3xl"
        />

        <div className="relative flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-white/80">
              {primeiraMaiuscula(dataExtensa.format(hoje))}
            </span>
            <Link
              className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-white/80 hover:bg-white/15"
              title="Suas vendas reais do Mercado Livre são poucas; o painel completa com um histórico de demonstração."
              to="/financeiro"
            >
              <InformationCircleIcon className="h-3.5 w-3.5" />
              {reais.length} vendas reais + dados de demonstração
            </Link>
          </div>

          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl">
              {saudacao(hoje.getHours())}, {primeiroNome}!
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/75">
              Até agora, hoje rendeu{' '}
              <strong className="text-white">{moeda.format(ritmo.faturamentoHoje)}</strong> em{' '}
              {inteiro.format(ritmo.pedidosHoje)} pedidos
              {diferencaRitmo !== null && (
                <>
                  {' — '}
                  <strong className={diferencaRitmo >= 0 ? 'text-[#85FA51]' : 'text-red-200'}>
                    {percentual.format(Math.abs(diferencaRitmo))}{' '}
                    {diferencaRitmo >= 0 ? 'acima' : 'abaixo'}
                  </strong>{' '}
                  do que uma {nomeDoDia.format(hoje)} costuma render até este horário
                </>
              )}
              .
            </p>
          </div>

          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              {
                rotulo: 'Vendas hoje',
                valor: moeda.format(ritmo.faturamentoHoje),
                atual: ritmo.faturamentoHoje,
                ref: ritmo.tipicoAteAgora,
              },
              {
                rotulo: 'Pedidos hoje',
                valor: inteiro.format(ritmo.pedidosHoje),
                atual: ritmo.pedidosHoje,
                ref: ritmo.pedidosTipicosAteAgora,
              },
              {
                rotulo: 'Ticket médio hoje',
                valor: moeda.format(ritmo.ticketHoje),
                atual: ritmo.ticketHoje,
                ref: ritmo.pedidosTipicosAteAgora
                  ? ritmo.tipicoAteAgora / ritmo.pedidosTipicosAteAgora
                  : 0,
              },
            ].map((item) => (
              <div
                className="rounded-lg bg-white/[0.07] p-3 ring-1 ring-white/10"
                key={item.rotulo}
              >
                <dt className="text-xs text-white/60">{item.rotulo}</dt>
                <dd className="mt-1 text-xl font-semibold">{item.valor}</dd>
                <dd className="mt-1.5">
                  <Comparacao atual={item.atual} referencia={item.ref} sufixo="vs. típico" />
                </dd>
              </div>
            ))}
          </dl>

          <nav aria-label="Atalhos" className="flex flex-wrap gap-2">
            {ATALHOS.map(({ rota, rotulo, icone: Icone }) => (
              <Link
                className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#85FA51] hover:text-[#00305c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#85FA51]"
                key={rota}
                to={rota}
              >
                <Icone className="h-4 w-4" />
                {rotulo}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Meta do mês */}
      <Card className="flex flex-col p-5 xl:col-span-4">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#00305c]">Meta do mês</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Dia {mes.diaAtual} de {mes.diasNoMes}
            </p>
          </div>
          <EditorMeta meta={meta} onSalvar={definirMeta} />
        </div>
        <div className="flex flex-1 items-center gap-5">
          <div className="relative shrink-0">
            <AnelMeta fracao={fracaoMeta} fracaoEsperada={mes.fracaoDecorrida} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-semibold text-[#00305c]">
                {percentual.format(fracaoMeta)}
              </span>
              <span className="text-[11px] text-muted-foreground">da meta</span>
            </div>
          </div>
          <dl className="flex flex-col gap-2.5 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Faturado</dt>
              <dd className="font-semibold text-[#00305c]">{moeda.format(mes.faturamento)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Meta</dt>
              <dd className="font-semibold text-[#00305c]">{moeda.format(meta)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Projeção no ritmo atual</dt>
              <dd className="font-semibold text-[#00305c]">{moedaCompacta.format(mes.projecao)}</dd>
            </div>
          </dl>
        </div>
        <p
          className={cn(
            'mt-3 rounded-md px-3 py-2 text-xs font-medium',
            noRitmo ? 'bg-[#85FA51]/20 text-[#1f5c0a]' : 'bg-amber-100 text-amber-800',
          )}
        >
          {noRitmo
            ? '✓ No ritmo para bater a meta.'
            : `Faltam ${moeda.format(Math.max(meta - mes.faturamento, 0))} — cerca de ${moedaCompacta.format(Math.max(meta - mes.faturamento, 0) / Math.max(mes.diasNoMes - mes.diaAtual + 1, 1))} por dia.`}
        </p>
      </Card>

      {/* Ritmo de hoje */}
      <Painel
        acao={<LinkPainel para="/financeiro">Ver financeiro</LinkPainel>}
        className="xl:col-span-8"
        subtitulo={`Faturamento acumulado ao longo do dia — uma ${nomeDoDia.format(hoje)} típica fecha em ${moeda.format(ritmo.tipicoDiaInteiro)}`}
        titulo="Ritmo de hoje"
      >
        <GraficoRitmo horaAtual={hoje.getHours()} pontos={ritmo.pontos} />
      </Painel>

      {/* Pendências */}
      <Painel
        className="xl:col-span-4"
        subtitulo="O que precisa da sua atenção agora"
        titulo="Pendências"
      >
        <ListaPendencias itens={dados.pendencias} />
      </Painel>

      {/* Produto destaque */}
      <Painel
        className="xl:col-span-4"
        subtitulo="Mais vendido nos últimos 7 dias"
        titulo="Produto destaque"
      >
        {dados.destaque ? (
          <ProdutoDestaque {...dados.destaque} />
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Sem vendas nesta semana.
          </p>
        )}
      </Painel>

      {/* Mapa de calor */}
      <Painel
        className="xl:col-span-8"
        subtitulo={
          calor.pico.valor > 0 ? (
            <>
              Pedidos por dia e horário nas últimas {calor.semanas} semanas — pico:{' '}
              <strong className="text-[#00305c]">
                {DIAS_MAPA[calor.pico.dia]} às {calor.pico.hora}h
              </strong>
              . Bom momento para campanhas e anúncios patrocinados.
            </>
          ) : (
            'Pedidos por dia e horário'
          )
        }
        titulo="Quando seus clientes compram"
      >
        <MapaDeCalor matriz={calor.matriz} />
      </Painel>

      {/* Feed */}
      <Painel
        acao={<LinkPainel para="/pedidos">Ver pedidos</LinkPainel>}
        className="xl:col-span-8"
        subtitulo="Últimos acontecimentos nas suas vendas"
        titulo="Atividade recente"
      >
        <FeedAtividade agora={hoje} eventos={dados.feed} />
      </Painel>

      {/* Canais */}
      <Painel
        acao={<LinkPainel para="/canais">Gerenciar</LinkPainel>}
        className="xl:col-span-4"
        subtitulo="Integrações com marketplaces"
        titulo="Seus canais"
      >
        <ul className="flex flex-col gap-3">
          <li className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-medium text-[#00305c]">
                <span
                  className={cn(
                    'h-2.5 w-2.5 rounded-full',
                    statusMl.data?.conectado
                      ? 'bg-[#85FA51] ring-4 ring-[#85FA51]/25'
                      : 'bg-red-500',
                  )}
                />
                Mercado Livre
              </span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  statusMl.data?.conectado
                    ? 'bg-[#85FA51]/25 text-[#1f5c0a]'
                    : 'bg-red-100 text-red-800',
                )}
              >
                {statusMl.data?.conectado ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
            {statusMl.data?.conectado && (
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-muted/60 p-2">
                  <dt className="text-[11px] text-muted-foreground">Ativos</dt>
                  <dd className="text-base font-semibold text-[#00305c]">{ativos}</dd>
                </div>
                <div className="rounded-md bg-muted/60 p-2">
                  <dt className="text-[11px] text-muted-foreground">Em revisão</dt>
                  <dd className="text-base font-semibold text-[#00305c]">{emRevisao}</dd>
                </div>
                <div className="rounded-md bg-muted/60 p-2">
                  <dt className="text-[11px] text-muted-foreground">Vendas reais</dt>
                  <dd className="text-base font-semibold text-[#00305c]">{reais.length}</dd>
                </div>
              </dl>
            )}
            {ultimaVendaReal && (
              <p className="mt-2 text-xs text-muted-foreground">
                Última venda real em {ultimaVendaReal.toLocaleDateString('pt-BR')}
              </p>
            )}
          </li>
          {OUTROS_CANAIS.map((canal) => (
            <li
              className="flex items-center justify-between rounded-lg border border-dashed border-border px-3 py-2.5"
              key={canal}
            >
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                {canal}
              </span>
              <span className="text-xs font-medium text-muted-foreground">Em breve</span>
            </li>
          ))}
        </ul>
      </Painel>
    </section>
  )
}
