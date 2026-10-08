import { Link } from 'react-router-dom'
import { CheckIcon, EnvelopeIcon, EnvelopeOpenIcon } from '@heroicons/react/24/outline'

import { cn } from '@/shared/lib/cn'

import { CATEGORIAS, type Gravidade, type Notificacao } from './dados'
import { ICONES } from './icones'

const ESTILOS: Record<Gravidade, { icone: string; rotulo: string; texto: string }> = {
  critica: { icone: 'bg-red-100 text-red-700', rotulo: 'Urgente', texto: 'text-red-700' },
  atencao: { icone: 'bg-amber-100 text-amber-800', rotulo: 'Atenção', texto: 'text-amber-800' },
  sucesso: {
    icone: 'bg-[#85FA51]/25 text-[#1f5c0a]',
    rotulo: 'Boa notícia',
    texto: 'text-[#1f5c0a]',
  },
  info: { icone: 'bg-[#005DAA]/10 text-[#005DAA]', rotulo: 'Informativo', texto: 'text-[#005DAA]' },
}

const relativo = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })
const dataHora = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

function tempoRelativo(data: Date, agora: Date) {
  const minutos = Math.round((data.getTime() - agora.getTime()) / 60_000)
  const inicioDoDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  // dias de calendário (e não blocos de 24 h), para bater com os grupos Hoje/Ontem
  const dias = Math.round((inicioDoDia(data) - inicioDoDia(agora)) / 86_400_000)
  if (dias === 0) {
    if (Math.abs(minutos) < 1) return 'agora'
    if (Math.abs(minutos) < 60) return relativo.format(minutos, 'minute')
    return relativo.format(Math.round(minutos / 60), 'hour')
  }
  if (Math.abs(dias) < 7) return relativo.format(dias, 'day')
  return dataHora.format(data)
}

type ItemNotificacaoProps = {
  notificacao: Notificacao
  lida: boolean
  agora: Date
  compacto?: boolean
  onMarcar: (lida: boolean) => void
  onAbrir?: () => void
}

export function ItemNotificacao({
  notificacao,
  lida,
  agora,
  compacto = false,
  onMarcar,
  onAbrir,
}: ItemNotificacaoProps) {
  const Icone = ICONES[notificacao.categoria]
  const estilo = ESTILOS[notificacao.gravidade]

  return (
    <div
      className={cn(
        'group relative flex gap-3 transition-colors',
        compacto ? 'px-4 py-3' : 'rounded-lg border p-4',
        !compacto &&
          (lida ? 'border-border bg-background' : 'border-[#005DAA]/25 bg-[#005DAA]/[0.03]'),
        compacto && 'hover:bg-muted/60',
      )}
    >
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
          estilo.icone,
          compacto && 'h-9 w-9',
        )}
      >
        <Icone className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p
            className={cn(
              'text-sm',
              lida ? 'font-medium text-foreground' : 'font-semibold text-[#00305c]',
            )}
          >
            {!lida && (
              <span
                aria-label="Não lida"
                className="mr-2 inline-block h-2 w-2 rounded-full bg-[#005DAA] align-middle"
                role="img"
              />
            )}
            {notificacao.titulo}
          </p>
          <span
            className="shrink-0 whitespace-nowrap text-xs text-muted-foreground"
            title={notificacao.data.toLocaleString('pt-BR')}
          >
            {tempoRelativo(notificacao.data, agora)}
          </span>
        </div>
        <p
          className={cn('mt-0.5 text-sm text-muted-foreground', compacto && 'line-clamp-2 text-xs')}
        >
          {notificacao.descricao}
        </p>

        {!compacto && (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
            <span className={cn('font-semibold uppercase tracking-wide', estilo.texto)}>
              {estilo.rotulo}
            </span>
            <span className="text-muted-foreground">· {CATEGORIAS[notificacao.categoria]}</span>
            {notificacao.real && (
              <span className="rounded bg-[#005DAA] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                Real
              </span>
            )}
            <span className="ml-auto flex items-center gap-2">
              <button
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA]"
                onClick={() => onMarcar(!lida)}
                type="button"
              >
                {lida ? (
                  <EnvelopeIcon className="h-3.5 w-3.5" />
                ) : (
                  <EnvelopeOpenIcon className="h-3.5 w-3.5" />
                )}
                {lida ? 'Marcar como não lida' : 'Marcar como lida'}
              </button>
              {notificacao.acao && (
                <Link
                  className="inline-flex items-center gap-1 rounded-md bg-[#005DAA] px-2.5 py-1 font-medium text-white hover:bg-[#00497f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA] focus-visible:ring-offset-2"
                  onClick={() => onMarcar(true)}
                  to={notificacao.acao.rota}
                >
                  {notificacao.acao.rotulo}
                </Link>
              )}
            </span>
          </div>
        )}
      </div>

      {compacto && (
        <>
          {notificacao.acao && (
            <Link
              aria-label={`${notificacao.titulo} — ${notificacao.acao.rotulo}`}
              className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#005DAA]"
              onClick={() => {
                onMarcar(true)
                onAbrir?.()
              }}
              to={notificacao.acao.rota}
            />
          )}
          {!lida && (
            <button
              aria-label="Marcar como lida"
              className="relative z-10 self-center rounded-md p-1.5 text-muted-foreground opacity-0 hover:bg-background hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
              onClick={() => onMarcar(true)}
              title="Marcar como lida"
              type="button"
            >
              <CheckIcon className="h-4 w-4" />
            </button>
          )}
        </>
      )}
    </div>
  )
}
