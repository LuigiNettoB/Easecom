import { Navigate, Outlet } from 'react-router-dom'

import { useAuth } from '@/shared/auth/AuthContext'

export function RotaPrivada() {
  const { autenticado, carregando } = useAuth()

  if (carregando) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    )
  }

  if (!autenticado) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export function RotaPublica() {
  const { autenticado, carregando } = useAuth()

  if (!carregando && autenticado) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
