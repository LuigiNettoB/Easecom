import { NavLink, Outlet } from 'react-router-dom'

import { useAuth } from '@/shared/auth/AuthContext'
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
          <div>
            <p className="text-sm font-medium">{usuario?.nome}</p>
            <p className="text-xs text-muted-foreground">{usuario?.vendedor.nome}</p>
          </div>
          <Button variant="outline" size="sm" onClick={sair}>
            Sair
          </Button>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
