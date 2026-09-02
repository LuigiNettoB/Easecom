import { useAuth } from '@/shared/auth/AuthContext'

export function Home() {
  const { usuario } = useAuth()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Olá, {usuario?.nome}</h1>
        <p className="mt-1 text-muted-foreground">
          Perfil: {usuario?.perfil} — Vendedor: {usuario?.vendedor.nome}
        </p>
      </div>
    </div>
  )
}
