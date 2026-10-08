import { useState, type ReactNode } from 'react'
import { MagnifyingGlassIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/outline'

import { cn } from '@/shared/lib/cn'
import { Input } from '@/shared/ui/Input'

import type { useFiltrosCatalogo } from './filtros'
import { ROTULOS_STATUS, statusDoProduto, type Produto } from './produtos'

const CATEGORIAS_VISIVEIS = 6

function SecaoFiltro({
  titulo,
  abertaInicialmente = false,
  quantidadeSelecionada = 0,
  children,
}: {
  titulo: string
  abertaInicialmente?: boolean
  quantidadeSelecionada?: number
  children: ReactNode
}) {
  const [aberta, setAberta] = useState(abertaInicialmente)
  const Icone = aberta ? MinusIcon : PlusIcon

  return (
    <div className="rounded-lg border border-border bg-background shadow-sm">
      <button
        aria-expanded={aberta}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-[#00305c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA]"
        onClick={() => setAberta((atual) => !atual)}
        type="button"
      >
        <span className="flex items-center gap-2">
          {titulo}
          {quantidadeSelecionada > 0 && (
            <span className="rounded-full bg-[#005DAA] px-1.5 text-xs font-medium text-white">
              {quantidadeSelecionada}
            </span>
          )}
        </span>
        <Icone className="h-4 w-4 text-muted-foreground" />
      </button>
      {aberta && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

function OpcaoMarcavel({
  rotulo,
  quantidade,
  marcada,
  onAlternar,
}: {
  rotulo: string
  quantidade: number
  marcada: boolean
  onAlternar: () => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 rounded px-1 py-1 text-sm hover:bg-[#85FA51]/10">
      <span className="flex items-center gap-2">
        <input
          checked={marcada}
          className="h-4 w-4 rounded border-border accent-[#005DAA]"
          onChange={onAlternar}
          type="checkbox"
        />
        <span className={cn(marcada ? 'font-medium text-[#005DAA]' : 'text-foreground')}>
          {rotulo}
        </span>
      </span>
      <span className="text-xs text-muted-foreground">{quantidade}</span>
    </label>
  )
}

function contar(valores: string[]) {
  const contagem = new Map<string, number>()
  valores.forEach((valor) => contagem.set(valor, (contagem.get(valor) ?? 0) + 1))
  return [...contagem.entries()].sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
}

type FiltrosLateralProps = {
  produtos: Produto[]
  acoes: ReturnType<typeof useFiltrosCatalogo>
}

export function FiltrosLateral({ produtos, acoes }: FiltrosLateralProps) {
  const { filtros } = acoes
  const [buscaCategoria, setBuscaCategoria] = useState('')
  const [todasCategorias, setTodasCategorias] = useState(false)

  const canais = contar(produtos.flatMap((produto) => produto.canais))
  const status = contar(produtos.map(statusDoProduto))
  const termoCategoria = buscaCategoria.trim().toLocaleLowerCase('pt-BR')
  const categorias = contar(produtos.map((produto) => produto.categoria)).filter(([categoria]) =>
    categoria.toLocaleLowerCase('pt-BR').includes(termoCategoria),
  )
  const categoriasExibidas =
    todasCategorias || termoCategoria ? categorias : categorias.slice(0, CATEGORIAS_VISIVEIS)

  return (
    <aside aria-label="Filtros do catálogo" className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-[#00305c]">Filtros</h2>

      <div className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3 shadow-sm">
        <span className="text-sm font-semibold text-[#00305c]" id="rotulo-estoque-baixo">
          Somente estoque baixo
        </span>
        <button
          aria-checked={filtros.estoqueBaixo}
          aria-labelledby="rotulo-estoque-baixo"
          className={cn(
            'relative h-5 w-9 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA] focus-visible:ring-offset-2',
            filtros.estoqueBaixo ? 'bg-[#005DAA]' : 'bg-muted-foreground/30',
          )}
          onClick={acoes.alternarEstoqueBaixo}
          role="switch"
          type="button"
        >
          <span
            className={cn(
              'absolute left-0 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
              filtros.estoqueBaixo ? 'translate-x-[18px]' : 'translate-x-0.5',
            )}
          />
        </button>
      </div>

      <SecaoFiltro
        abertaInicialmente
        quantidadeSelecionada={filtros.categorias.length}
        titulo="Categorias"
      >
        <div className="relative mb-2">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Buscar categoria"
            className="h-9 bg-muted/50 pl-8 text-xs focus-visible:ring-[#005DAA]"
            onChange={(event) => setBuscaCategoria(event.target.value)}
            placeholder={`Buscar em ${categorias.length} categorias`}
            value={buscaCategoria}
          />
        </div>
        <div className="flex flex-col">
          {categoriasExibidas.map(([categoria, quantidade]) => (
            <OpcaoMarcavel
              key={categoria}
              marcada={filtros.categorias.includes(categoria)}
              onAlternar={() => acoes.alternarItem('categorias', categoria)}
              quantidade={quantidade}
              rotulo={categoria}
            />
          ))}
          {categoriasExibidas.length === 0 && (
            <p className="py-1 text-xs text-muted-foreground">Nenhuma categoria encontrada.</p>
          )}
        </div>
        {!termoCategoria && categorias.length > CATEGORIAS_VISIVEIS && (
          <button
            className="mt-1 text-xs font-medium text-[#005DAA] hover:underline"
            onClick={() => setTodasCategorias((atual) => !atual)}
            type="button"
          >
            {todasCategorias ? 'Ver menos' : `Ver todas (${categorias.length})`}
          </button>
        )}
      </SecaoFiltro>

      <SecaoFiltro abertaInicialmente quantidadeSelecionada={filtros.status.length} titulo="Status">
        <div className="flex flex-col">
          {status.map(([valor, quantidade]) => (
            <OpcaoMarcavel
              key={valor}
              marcada={filtros.status.includes(valor)}
              onAlternar={() => acoes.alternarItem('status', valor)}
              quantidade={quantidade}
              rotulo={ROTULOS_STATUS[valor] ?? valor}
            />
          ))}
        </div>
      </SecaoFiltro>

      <SecaoFiltro quantidadeSelecionada={filtros.canais.length} titulo="Canais">
        <div className="flex flex-col">
          {canais.map(([canal, quantidade]) => (
            <OpcaoMarcavel
              key={canal}
              marcada={filtros.canais.includes(canal)}
              onAlternar={() => acoes.alternarItem('canais', canal)}
              quantidade={quantidade}
              rotulo={canal}
            />
          ))}
          {canais.length === 0 && (
            <p className="py-1 text-xs text-muted-foreground">Nenhum canal com produtos.</p>
          )}
        </div>
      </SecaoFiltro>

      <SecaoFiltro
        quantidadeSelecionada={filtros.precoMin || filtros.precoMax ? 1 : 0}
        titulo="Faixa de preço"
      >
        <div className="flex items-center gap-2">
          <Input
            aria-label="Preço mínimo"
            className="h-9 text-xs focus-visible:ring-[#005DAA]"
            inputMode="decimal"
            onChange={(event) => acoes.definirPrecoMin(event.target.value)}
            placeholder="Mín. R$"
            value={filtros.precoMin}
          />
          <span className="text-muted-foreground">–</span>
          <Input
            aria-label="Preço máximo"
            className="h-9 text-xs focus-visible:ring-[#005DAA]"
            inputMode="decimal"
            onChange={(event) => acoes.definirPrecoMax(event.target.value)}
            placeholder="Máx. R$"
            value={filtros.precoMax}
          />
        </div>
      </SecaoFiltro>
    </aside>
  )
}
