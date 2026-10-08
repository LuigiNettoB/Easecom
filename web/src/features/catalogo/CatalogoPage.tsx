import { useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import {
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  ChevronRightIcon,
  ListBulletIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  Squares2X2Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

import type { ErroApi } from '@/shared/api/types'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Input'

import { CadastroProdutoModal } from './CadastroProdutoModal'
import {
  ORDENACOES,
  aplicarFiltros,
  chipsDosFiltros,
  useFiltrosCatalogo,
  type Ordenacao,
  type Visao,
} from './filtros'
import { FiltrosLateral } from './FiltrosLateral'
import { cadastrarProdutoLocal, useAnunciosMercadoLivre, useProdutosCadastrados } from './produtos'
import { GradeProdutos, ListaProdutos } from './ProdutosVisualizacao'

const OPCOES_VISAO: { valor: Visao; rotulo: string; icone: typeof Squares2X2Icon }[] = [
  { valor: 'grade', rotulo: 'Visualizar em grade', icone: Squares2X2Icon },
  { valor: 'lista', rotulo: 'Visualizar em lista', icone: ListBulletIcon },
]

export function CatalogoPage() {
  const anuncios = useAnunciosMercadoLivre()
  const produtosCadastrados = useProdutosCadastrados()
  const acoes = useFiltrosCatalogo()
  const { filtros } = acoes

  const [modalAberto, setModalAberto] = useState(false)
  const [filtrosAbertosNoCelular, setFiltrosAbertosNoCelular] = useState(false)

  const produtos = [...produtosCadastrados, ...(anuncios.data ?? [])]
  const produtosFiltrados = aplicarFiltros(produtos, filtros)
  const chips = chipsDosFiltros(filtros, acoes)
  const codigoErro = axios.isAxiosError<ErroApi>(anuncios.error)
    ? anuncios.error.response?.data.codigo
    : undefined

  return (
    <section className="space-y-6">
      <nav aria-label="Trilha de navegação" className="flex items-center gap-1.5 text-sm">
        <Link className="text-[#005DAA] hover:underline" to="/">
          Início
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">Catálogo</span>
      </nav>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#00305c]">Catálogo e estoque</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visualize seus produtos, o estoque disponível e os canais em que estão anunciados.
          </p>
          {anuncios.isSuccess && (
            <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-[#85FA51]" />
              {anuncios.data.length} anúncios sincronizados do Mercado Livre
              <button
                aria-label="Atualizar anúncios do Mercado Livre"
                className="rounded p-1 text-[#005DAA] hover:bg-[#005DAA]/10 disabled:opacity-50"
                disabled={anuncios.isFetching}
                onClick={() => void anuncios.refetch()}
                type="button"
              >
                <ArrowPathIcon
                  className={cn('h-3.5 w-3.5', anuncios.isFetching && 'animate-spin')}
                />
              </button>
            </p>
          )}
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Buscar produto"
              className="pl-9 focus-visible:ring-[#005DAA]"
              onChange={(event) => acoes.definirBusca(event.target.value)}
              placeholder="Buscar produto ou SKU"
              value={filtros.busca}
            />
          </div>
          <Button
            className="flex items-center gap-2 whitespace-nowrap bg-[#005DAA] text-white hover:bg-[#00497f]"
            onClick={() => setModalAberto(true)}
            type="button"
          >
            <PlusIcon className="h-4 w-4" />
            Cadastrar produto
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className={cn(!filtrosAbertosNoCelular && 'hidden', 'lg:block')}>
          <FiltrosLateral acoes={acoes} produtos={produtos} />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {chips.map((chip) => (
                <span
                  className="flex items-center gap-1 rounded-md border border-border bg-background py-1 pl-2.5 pr-1 text-xs text-foreground shadow-sm"
                  key={chip.chave}
                >
                  {chip.rotulo}
                  <button
                    aria-label={`Remover filtro ${chip.rotulo}`}
                    className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={chip.remover}
                    type="button"
                  >
                    <XMarkIcon className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
              <button
                className="ml-1 text-xs font-medium text-[#005DAA] underline-offset-2 hover:underline"
                onClick={acoes.limparTudo}
                type="button"
              >
                Limpar tudo
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button
                className="flex items-center gap-2 lg:hidden"
                onClick={() => setFiltrosAbertosNoCelular((atual) => !atual)}
                size="sm"
                type="button"
                variant="outline"
              >
                <AdjustmentsHorizontalIcon className="h-4 w-4" />
                Filtros{chips.length > 0 && ` (${chips.length})`}
              </Button>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-[#00305c]">{produtosFiltrados.length}</span>{' '}
                {produtosFiltrados.length === 1 ? 'produto' : 'produtos'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                Ordenar por
                <select
                  className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA]"
                  onChange={(event) => acoes.definirOrdem(event.target.value as Ordenacao)}
                  value={filtros.ordem}
                >
                  {Object.entries(ORDENACOES).map(([valor, rotulo]) => (
                    <option key={valor} value={valor}>
                      {rotulo}
                    </option>
                  ))}
                </select>
              </label>
              <div
                aria-label="Modo de visualização"
                className="flex rounded-md border border-border bg-background p-0.5"
                role="group"
              >
                {OPCOES_VISAO.map(({ valor, rotulo, icone: Icone }) => (
                  <button
                    aria-label={rotulo}
                    aria-pressed={filtros.visao === valor}
                    className={cn(
                      'rounded p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA]',
                      filtros.visao === valor
                        ? 'bg-[#005DAA] text-white'
                        : 'text-muted-foreground hover:bg-[#85FA51]/10 hover:text-foreground',
                    )}
                    key={valor}
                    onClick={() => acoes.definirVisao(valor)}
                    title={rotulo}
                    type="button"
                  >
                    <Icone className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {anuncios.isError && (
            <p className="rounded-lg border border-border bg-background px-5 py-4 text-sm text-muted-foreground shadow-sm">
              {codigoErro === 'ml_nao_conectado' ? (
                <>
                  Conecte sua conta do Mercado Livre em{' '}
                  <Link className="font-medium text-[#005DAA] hover:underline" to="/canais">
                    Canais
                  </Link>{' '}
                  para ver seus anúncios aqui.
                </>
              ) : (
                'Não foi possível carregar os anúncios do Mercado Livre. Tente novamente.'
              )}
            </p>
          )}

          {anuncios.isPending ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Carregando anúncios do Mercado Livre...
            </p>
          ) : produtosFiltrados.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-16 text-center">
              <p className="text-sm text-muted-foreground">Nenhum produto encontrado.</p>
              {chips.length > 0 && (
                <button
                  className="mt-2 text-sm font-medium text-[#005DAA] hover:underline"
                  onClick={acoes.limparTudo}
                  type="button"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          ) : filtros.visao === 'grade' ? (
            <GradeProdutos produtos={produtosFiltrados} />
          ) : (
            <ListaProdutos produtos={produtosFiltrados} />
          )}
        </div>
      </div>

      {modalAberto && (
        <CadastroProdutoModal
          onCadastrar={cadastrarProdutoLocal}
          onFechar={() => setModalAberto(false)}
        />
      )}
    </section>
  )
}
