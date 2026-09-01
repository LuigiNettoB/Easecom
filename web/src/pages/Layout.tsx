import { NavLink, Outlet } from 'react-router-dom'

import { useAuth } from '@/shared/auth/AuthContext'
import { Avatar } from '@/shared/ui/Avatar'
import { Button } from '@/shared/ui/Button'
import { cn } from '@/shared/lib/cn'

const ITENS_MENU = [
  { rota: '/', rotulo: 'Início' },
  { rota: '/catalogo', rotulo: 'Catálogo' },
  { rota: '/estoque', rotulo: 'Estoque' },
  { rota: '/pedidos', rotulo: 'Pedidos' },
  { rota: '/fornecedores', rotulo: 'Fornecedores' },
  { rota: '/financeiro', rotulo: 'Financeiro' },
  { rota: '/canais', rotulo: 'Canais' },
  { rota: '/configuracoes', rotulo: 'Configurações' },
]

export function Layout() {
  const { usuario, sair } = useAuth()

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 flex-col border-r border-border bg-muted p-4">
        <p className="mb-6 text-lg font-semibold">HubMulticanal</p>
        <nav className="flex flex-col gap-1">
          {ITENS_MENU.map((item) => (
            <NavLink
              key={item.rota}
              to={item.rota}
              end={item.rota === '/'}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-2 text-sm font-medium hover:bg-background',
                  isActive && 'bg-background text-primary',
                )
              }
            >
              {item.rotulo}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <Avatar
              src={usuario?.foto_perfil_url}
              nome={usuario?.nome}
              className="h-9 w-9 text-sm"
            />
            <div>
              <p className="text-sm font-medium">{usuario?.nome}</p>
              <p className="text-xs text-muted-foreground">{usuario?.vendedor.nome}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NavLink
              to="/notificacoes"
              aria-label="Notificações"
              className={({ isActive }) =>
                cn(
                  'flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground',
                  isActive && 'bg-muted text-primary',
                )
              }
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                />
              </svg>
            </NavLink>
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
