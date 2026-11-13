import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

import { SinoNotificacoes } from '@/features/notificacoes/SinoNotificacoes'
import { useNotificacoes } from '@/features/notificacoes/dados'
import { useAuth } from '@/shared/auth/AuthContext'
import { Button } from '@/shared/ui/Button'
import { cn } from '@/shared/lib/cn'

import {
  HomeIcon,
  ClipboardDocumentListIcon,
  ShoppingCartIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  LinkIcon,
  Cog6ToothIcon,
  BellIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from '@heroicons/react/24/outline'

const ITENS_MENU = [
  { rota: '/', rotulo: 'Início', icone: HomeIcon },
  { rota: '/catalogo', rotulo: 'Catálogo', icone: ClipboardDocumentListIcon },
  { rota: '/pedidos', rotulo: 'Pedidos', icone: ShoppingCartIcon },
  { rota: '/fornecedores', rotulo: 'Fornecedores', icone: UserGroupIcon },
  { rota: '/financeiro', rotulo: 'Financeiro', icone: CurrencyDollarIcon },
  { rota: '/canais', rotulo: 'Canais', icone: LinkIcon },
  { rota: '/notificacoes', rotulo: 'Notificações', icone: BellIcon },
  {
    rota: '/configuracoes',
    rotulo: 'Configurações',
    icone: Cog6ToothIcon,
  },
]

const CHAVE_MENU_RECOLHIDO = 'easecom.menu-recolhido'

// a preferência é só conveniência: se o armazenamento falhar, o menu abre expandido
function lerMenuRecolhido() {
  try {
    return localStorage.getItem(CHAVE_MENU_RECOLHIDO) === '1'
  } catch {
    return false
  }
}

function salvarMenuRecolhido(recolhido: boolean) {
  try {
    localStorage.setItem(CHAVE_MENU_RECOLHIDO, recolhido ? '1' : '0')
  } catch {
    // sem armazenamento disponível, a escolha vale só até recarregar
  }
}

export function Layout() {
  const { usuario, sair } = useAuth()
  const [recolhido, setRecolhido] = useState(lerMenuRecolhido)
  const notificacoes = useNotificacoes()

  function alternarMenu() {
    setRecolhido((atual) => {
      salvarMenuRecolhido(!atual)
      return !atual
    })
  }

  const IconeAlternar = recolhido ? ChevronDoubleRightIcon : ChevronDoubleLeftIcon

  return (
    <div className="flex min-h-screen ">
      <aside
        className={cn(
          'sticky top-0 flex h-screen shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r border-border bg-[#00305c] p-4 transition-[width] duration-200',
          recolhido ? 'w-[72px]' : 'w-60',
        )}
      >
        <div className={cn('mb-6 flex items-center gap-2', recolhido && 'justify-center')}>
          <img src="../public/icone_carrinho.png" alt="" className="h-7 w-7 shrink-0" />
          {!recolhido && <p className="text-lg text-white font-semibold">Easecom</p>}
        </div>

        <nav aria-label="Menu principal" className="flex flex-col gap-1">
          {ITENS_MENU.map((item) => {
            const Icone = item.icone

            return (
              <NavLink
                key={item.rota}
                to={item.rota}
                end={item.rota === '/'}
                title={recolhido ? item.rotulo : undefined}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm text-white font-medium hover:text-black hover:bg-green-300',
                    recolhido && 'justify-center px-0',
                    isActive && 'bg-green-500 text-black',
                  )
                }
              >
                <span className="relative">
                  <Icone className="h-5 w-5 shrink-0" />
                  {item.rota === '/notificacoes' && recolhido && notificacoes.naoLidas > 0 && (
                    <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#85FA51] ring-2 ring-[#00305c]" />
                  )}
                </span>
                <span className={cn(recolhido && 'sr-only')}>{item.rotulo}</span>
                {item.rota === '/notificacoes' && !recolhido && notificacoes.naoLidas > 0 && (
                  <span className="ml-auto rounded-full bg-[#85FA51] px-1.5 text-xs font-bold text-[#00305c]">
                    {notificacoes.naoLidas > 99 ? '99+' : notificacoes.naoLidas}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>

        <button
          aria-expanded={!recolhido}
          aria-label={recolhido ? 'Expandir menu' : 'Recolher menu'}
          className={cn(
            'mt-auto flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-300',
            recolhido && 'justify-center px-0',
          )}
          onClick={alternarMenu}
          title={recolhido ? 'Expandir menu' : 'Recolher menu'}
          type="button"
        >
          <IconeAlternar className="h-5 w-5 shrink-0" />
          {!recolhido && <span>Recolher menu</span>}
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col ">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="text-sm font-medium">{usuario?.nome}</p>
            <p className="text-xs text-muted-foreground">{usuario?.vendedor.nome}</p>
          </div>

          <div className="flex items-center gap-3">
            <SinoNotificacoes notificacoes={notificacoes} />
            <Button variant="outline" size="sm" onClick={sair}>
              Sair
            </Button>
          </div>
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
