import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BellIcon } from '@heroicons/react/24/outline'

import { cn } from '@/shared/lib/cn'

import { ItemNotificacao } from './componentes'
import type { useNotificacoes } from './dados'

const PREVIA = 6

export function SinoNotificacoes({
  notificacoes: n,
}: {
  notificacoes: ReturnType<typeof useNotificacoes>
}) {
  const [aberto, setAberto] = useState(false)
  const container = useRef<HTMLDivElement | null>(null)
  const { pathname } = useLocation()

  // fecha ao navegar, ao clicar fora ou com Esc
  useEffect(() => setAberto(false), [pathname])
  useEffect(() => {
    if (!aberto) return
    const aoClicar = (e: MouseEvent) => {
      if (container.current && !container.current.contains(e.target as Node)) setAberto(false)
    }
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false)
    document.addEventListener('mousedown', aoClicar)
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('mousedown', aoClicar)
      document.removeEventListener('keydown', aoTeclar)
    }
  }, [aberto])

  // não lidas primeiro, depois as mais recentes
  const previa = [...n.visiveis]
    .sort((a, b) => Number(n.estaLida(a.id)) - Number(n.estaLida(b.id)))
    .slice(0, PREVIA)

  return (
    <div className="relative" ref={container}>
      <button
        aria-expanded={aberto}
        aria-haspopup="dialog"
        aria-label={n.naoLidas ? `Notificações: ${n.naoLidas} não lidas` : 'Notificações'}
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA]',
          aberto && 'bg-muted text-foreground',
        )}
        onClick={() => setAberto((atual) => !atual)}
        type="button"
      >
        <BellIcon className="h-5 w-5" />
        {n.naoLidas > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#85FA51] px-1 text-[10px] font-bold text-[#00305c] ring-2 ring-background">
            {n.naoLidas > 99 ? '99+' : n.naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div
          aria-label="Notificações recentes"
          className="absolute right-0 top-full z-40 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border bg-background shadow-xl"
          role="dialog"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-[#00305c]">
              Notificações
              {n.naoLidas > 0 && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {n.naoLidas} não lidas
                </span>
              )}
            </p>
            {n.naoLidas > 0 && (
              <button
                className="text-xs font-medium text-[#005DAA] hover:underline"
                onClick={() => n.marcarTodasLidas(n.visiveis.map((item) => item.id))}
                type="button"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>
          <div className="max-h-[26rem] divide-y divide-border overflow-y-auto">
            {n.carregando ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Carregando...</p>
            ) : previa.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Nenhuma notificação.
              </p>
            ) : (
              previa.map((item) => (
                <ItemNotificacao
                  agora={n.hoje}
                  compacto
                  key={item.id}
                  lida={n.estaLida(item.id)}
                  notificacao={item}
                  onAbrir={() => setAberto(false)}
                  onMarcar={(lida) => n.marcarLida(item.id, lida)}
                />
              ))
            )}
          </div>
          <Link
            className="block border-t border-border bg-muted/40 px-4 py-2.5 text-center text-sm font-medium text-[#005DAA] hover:bg-muted"
            to="/notificacoes"
          >
            Ver todas as notificações
          </Link>
        </div>
      )}
    </div>
  )
}
