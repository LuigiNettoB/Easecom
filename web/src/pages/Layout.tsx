import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

import { useAuth } from '@/shared/auth/AuthContext'
import { Avatar } from '@/shared/ui/Avatar'
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
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

const ITENS_MENU = [
  { rota: '/', rotulo: 'Início', icone: HomeIcon },
  { rota: '/catalogo', rotulo: 'Catálogo', icone: ClipboardDocumentListIcon },
  { rota: '/pedidos', rotulo: 'Pedidos', icone: ShoppingCartIcon },
  { rota: '/fornecedores', rotulo: 'Fornecedores', icone: UserGroupIcon },
  { rota: '/financeiro', rotulo: 'Financeiro', icone: CurrencyDollarIcon },
  { rota: '/canais', rotulo: 'Canais', icone: LinkIcon },
  {
    rota: '/configuracoes',
    rotulo: 'Configurações',
    icone: Cog6ToothIcon,
  },
]

export function Layout() {
  const { usuario, sair } = useAuth()
  const [menuAberto, setMenuAberto] = useState(false)

  return (
    <div className="flex min-h-screen">
      <aside className="hidden md:flex w-60 flex-col border-r border-border bg-muted p-4">
        <p className="mb-6 text-lg font-semibold">Easecom</p>

        <nav className="flex flex-col gap-1">
          {ITENS_MENU.map((item) => {
            const Icone = item.icone

            return (
              <NavLink
                key={item.rota}
                to={item.rota}
                end={item.rota === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium hover:bg-green-300',
                    isActive && 'bg-green-500 text-primary',
                  )
                }
              >
                <Icone className="h-5 w-5 shrink-0" />
                <span>{item.rotulo}</span>
              </NavLink>
            )
          })}
        </nav>
      </aside>

      {menuAberto && (
        <div className="fixed inset-0 z-50 flex flex-col bg-muted p-4 md:hidden">
          <div className="flex items-center justify-between mb-6">
            <p className="text-lg font-semibold">Easecom</p>
            <Button variant="ghost" size="sm" onClick={() => setMenuAberto(false)}>
              <XMarkIcon className="h-6 w-6" />
            </Button>
          </div>

          <nav className="flex flex-col gap-2">
            {ITENS_MENU.map((item) => {
              const Icone = item.icone

              return (
                <NavLink
                  key={item.rota}
                  to={item.rota}
                  end={item.rota === '/'}
                  onClick={() => setMenuAberto(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-md px-3 py-3 text-base font-medium hover:bg-green-300',
                      isActive && 'bg-green-500 text-primary',
                    )
                  }
                >
                  <Icone className="h-6 w-6 shrink-0" />
                  <span>{item.rotulo}</span>
                </NavLink>
              )
            })}
          </nav>
        </div>
      )}

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-4 md:px-6 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="md:hidden"
              onClick={() => setMenuAberto(true)}
            >
              <Bars3Icon className="h-5 w-5" />
            </Button>

            <div>
              <p className="text-sm font-medium">{usuario?.nome}</p>
              <p className="text-xs text-muted-foreground">
                {usuario?.vendedor.nome}
              </p>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={sair}>
            Sair
          </Button>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}