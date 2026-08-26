import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-semibold">Página não encontrada</h1>
      <Link to="/" className="text-primary underline">
        Voltar para o início
      </Link>
    </div>
  )
}
