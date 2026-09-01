import { cn } from '@/shared/lib/cn'

interface AvatarProps {
  src?: string | null
  nome?: string | null
  className?: string
}

function obterIniciais(nome?: string | null) {
  const partes = nome?.trim().split(/\s+/).filter(Boolean) ?? []
  if (partes.length === 0) return '?'
  return partes
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('')
}

export function Avatar({ src, nome, className }: AvatarProps) {
  return (
    <div
      className={cn(
        'flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-lg font-medium text-muted-foreground',
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt={nome ? `Foto de perfil de ${nome}` : 'Foto de perfil'}
          className="h-full w-full object-cover"
        />
      ) : (
        obterIniciais(nome)
      )}
    </div>
  )
}
