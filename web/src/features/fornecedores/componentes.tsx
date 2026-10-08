import type { MouseEvent } from 'react'
import {
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  PhoneIcon,
  StarIcon as EstrelaVazia,
} from '@heroicons/react/24/outline'
import { StarIcon } from '@heroicons/react/24/solid'

import { cn } from '@/shared/lib/cn'

import { iniciaisFornecedor, linkEmail, linkWhatsApp, type Fornecedor } from './dados'

// textura sutil de pontos sobre o degradê do banner
const PADRAO_PONTOS =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Ccircle cx='2' cy='2' r='1.2' fill='white' fill-opacity='0.14'/%3E%3C/svg%3E\")"

export function BannerFornecedor({
  fornecedor,
  fotos = [],
  className,
}: {
  fornecedor: Fornecedor
  fotos?: string[]
  className?: string
}) {
  const [inicio, fim] = fornecedor.cores
  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{ backgroundImage: `${PADRAO_PONTOS}, linear-gradient(120deg, ${inicio}, ${fim})` }}
    >
      <div
        aria-hidden="true"
        className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-[#85FA51]/20 blur-2xl"
      />
      {fotos.length > 0 && (
        <div aria-hidden="true" className="absolute bottom-0 right-4 top-0 flex items-center gap-2">
          {fotos.slice(0, 3).map((foto, i) => (
            <div
              className="h-[62%] max-h-24 overflow-hidden rounded-lg bg-white p-1.5 shadow-lg ring-1 ring-white/40"
              key={foto}
              style={{
                aspectRatio: '1',
                transform: `rotate(${[-6, 3, -2][i]}deg) translateY(${[6, -4, 4][i]}px)`,
              }}
            >
              <img alt="" className="h-full w-full object-contain" src={foto} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function AvatarFornecedor({
  fornecedor,
  tamanho = 'md',
  className,
}: {
  fornecedor: Fornecedor
  tamanho?: 'md' | 'lg'
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-2xl bg-white font-bold shadow-md ring-4 ring-background',
        tamanho === 'lg' ? 'h-24 w-24 text-3xl' : 'h-16 w-16 text-xl',
        className,
      )}
    >
      <span
        className="flex h-[86%] w-[86%] items-center justify-center rounded-xl text-white"
        style={{
          backgroundImage: `linear-gradient(135deg, ${fornecedor.cores[0]}, ${fornecedor.cores[1]})`,
        }}
      >
        {iniciaisFornecedor(fornecedor.nome)}
      </span>
    </div>
  )
}

export function Estrelas({ nota }: { nota: number }) {
  return (
    <span className="inline-flex items-center gap-1" title={`Avaliação ${nota.toFixed(1)} de 5`}>
      <span aria-hidden="true" className="flex">
        {Array.from({ length: 5 }, (_, i) =>
          i < Math.round(nota) ? (
            <StarIcon className="h-3.5 w-3.5 text-amber-400" key={i} />
          ) : (
            <EstrelaVazia className="h-3.5 w-3.5 text-amber-300" key={i} />
          ),
        )}
      </span>
      <span className="text-xs font-semibold text-[#00305c]">
        {nota.toFixed(1).replace('.', ',')}
      </span>
      <span className="sr-only">de 5</span>
    </span>
  )
}

const pararPropagacao = (evento: MouseEvent) => evento.stopPropagation()

export function BotoesContato({
  fornecedor,
  compacto = false,
}: {
  fornecedor: Fornecedor
  compacto?: boolean
}) {
  const saudacao = `Olá, ${fornecedor.contato.nome.split(' ')[0]}! Tudo bem?`
  const base =
    'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA] focus-visible:ring-offset-2'
  const tamanho = compacto ? 'h-9 px-3' : 'h-10 px-4'
  return (
    <div className="flex flex-wrap gap-2">
      <a
        className={cn(base, tamanho, 'bg-[#85FA51] text-[#00305c] hover:bg-[#6fe03c]')}
        href={linkWhatsApp(fornecedor.whatsapp, saudacao)}
        onClick={pararPropagacao}
        rel="noreferrer"
        target="_blank"
      >
        <ChatBubbleLeftRightIcon className="h-4 w-4" />
        WhatsApp
      </a>
      <a
        className={cn(base, tamanho, 'bg-[#005DAA] text-white hover:bg-[#00497f]')}
        href={linkEmail(fornecedor.email, `Contato — ${fornecedor.nome}`, `${saudacao}\n\n`)}
        onClick={pararPropagacao}
      >
        <EnvelopeIcon className="h-4 w-4" />
        E-mail
      </a>
      {!compacto && (
        <a
          className={cn(
            base,
            tamanho,
            'border border-border bg-background text-foreground hover:bg-muted',
          )}
          href={`tel:${fornecedor.telefone.replace(/\D/g, '')}`}
        >
          <PhoneIcon className="h-4 w-4" />
          Ligar
        </a>
      )}
    </div>
  )
}
