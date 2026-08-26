export function PaginaEmConstrucao({ titulo }: { titulo: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">{titulo}</h1>
      <p className="mt-2 text-muted-foreground">Em construção.</p>
    </div>
  )
}
