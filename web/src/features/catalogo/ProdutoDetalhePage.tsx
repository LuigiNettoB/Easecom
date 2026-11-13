import { useState } from 'react'
import axios from 'axios'
import { Link, useLocation, useParams } from 'react-router-dom'
import {
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
  ChevronRightIcon,
  ShieldCheckIcon,
  TruckIcon,
} from '@heroicons/react/24/outline'

import type { AnuncioMercadoLivreDetalhe, ErroApi } from '@/shared/api/types'
import { cn } from '@/shared/lib/cn'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card'

import {
  LIMITE_ESTOQUE_BAIXO,
  ROTULOS_STATUS,
  STATUS_NAO_PUBLICADO,
  moeda,
  useAnuncioMercadoLivre,
  useProdutosCadastrados,
} from './produtos'

const ATRIBUTOS_VISIVEIS = 12
const LIMITE_DESCRICAO = 600

const ROTULOS_CONDICAO: Record<string, string> = { new: 'Novo', used: 'Usado' }

// Formato único da tela: tanto anúncio do ML quanto produto cadastrado localmente.
type ProdutoDetalhado = Pick<
  AnuncioMercadoLivreDetalhe,
  'id' | 'titulo' | 'sku' | 'categoria' | 'preco' | 'estoque' | 'vendidos' | 'status' | 'fotos'
> &
  Partial<
    Pick<
      AnuncioMercadoLivreDetalhe,
      'link' | 'descricao' | 'condicao' | 'garantia' | 'frete_gratis' | 'atributos'
    >
  > & { canais: string[] }

function Galeria({ fotos, titulo }: { fotos: string[]; titulo: string }) {
  const [selecionada, setSelecionada] = useState(0)

  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-square overflow-hidden rounded-lg border border-border bg-white">
        <img
          alt={`Foto ${selecionada + 1} de ${titulo}`}
          className="h-full w-full object-contain p-6"
          src={fotos[selecionada]}
        />
      </div>
      {fotos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {fotos.map((foto, indice) => (
            <button
              aria-label={`Ver foto ${indice + 1}`}
              aria-pressed={indice === selecionada}
              className={cn(
                'h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA]',
                indice === selecionada
                  ? 'border-[#005DAA]'
                  : 'border-border opacity-70 hover:opacity-100',
              )}
              key={foto}
              onClick={() => setSelecionada(indice)}
              type="button"
            >
              <img alt="" className="h-full w-full object-contain p-1" src={foto} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Indicador({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string
  valor: string
  destaque?: string
}) {
  return (
    <div className={cn('rounded-lg border border-l-4 border-border p-3', destaque)}>
      <p className="text-xs text-muted-foreground">{rotulo}</p>
      <p className="mt-0.5 text-lg font-semibold text-[#00305c]">{valor}</p>
    </div>
  )
}

function ConteudoProduto({ produto }: { produto: ProdutoDetalhado }) {
  const [descricaoCompleta, setDescricaoCompleta] = useState(false)
  const [todosAtributos, setTodosAtributos] = useState(false)

  const estoqueBaixo = produto.estoque <= LIMITE_ESTOQUE_BAIXO
  const descricao = produto.descricao ?? ''
  const descricaoLonga = descricao.length > LIMITE_DESCRICAO
  const atributos = produto.atributos ?? []
  const atributosExibidos = todosAtributos ? atributos : atributos.slice(0, ATRIBUTOS_VISIVEIS)

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-2">
        <Galeria fotos={produto.fotos} titulo={produto.titulo} />

        <div className="flex flex-col gap-5">
          <div>
            <p className="text-sm font-semibold text-[#005DAA]">{produto.categoria}</p>
            <h1 className="mt-1 text-2xl font-semibold leading-tight text-[#00305c]">
              {produto.titulo}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span
                className={cn(
                  'rounded-full px-2.5 py-1 font-medium',
                  produto.status === 'active'
                    ? 'bg-[#85FA51]/25 text-[#1f5c0a]'
                    : 'bg-amber-100 text-amber-800',
                )}
              >
                {ROTULOS_STATUS[produto.status] ?? produto.status}
              </span>
              {produto.condicao && (
                <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-foreground">
                  {ROTULOS_CONDICAO[produto.condicao] ?? produto.condicao}
                </span>
              )}
              <span className="font-mono text-muted-foreground">
                SKU {produto.sku || '—'} · {produto.id}
              </span>
            </div>
          </div>

          <p className="text-3xl font-semibold text-[#005DAA]">{moeda.format(produto.preco)}</p>

          <div className="grid grid-cols-2 gap-3">
            <Indicador
              destaque={estoqueBaixo ? 'border-l-red-500' : 'border-l-[#85FA51]'}
              rotulo={estoqueBaixo ? 'Estoque (baixo)' : 'Estoque disponível'}
              valor={`${produto.estoque} un.`}
            />
            <Indicador
              destaque="border-l-[#005DAA]"
              rotulo="Vendidos"
              valor={`${produto.vendidos} un.`}
            />
          </div>

          {(produto.frete_gratis || produto.garantia) && (
            <ul className="flex flex-col gap-2 text-sm text-foreground">
              {produto.frete_gratis && (
                <li className="flex items-center gap-2">
                  <TruckIcon className="h-5 w-5 text-[#1f5c0a]" />
                  Frete grátis
                </li>
              )}
              {produto.garantia && (
                <li className="flex items-center gap-2">
                  <ShieldCheckIcon className="h-5 w-5 text-[#005DAA]" />
                  {produto.garantia}
                </li>
              )}
            </ul>
          )}

          <div>
            <p className="mb-2 text-sm font-medium text-[#00305c]">Canais</p>
            <div className="flex flex-wrap gap-1.5">
              {produto.canais.map((canal) => (
                <span
                  className="rounded-full bg-[#005DAA]/10 px-2.5 py-1 text-xs font-medium text-[#005DAA]"
                  key={canal}
                >
                  {canal}
                </span>
              ))}
              {produto.canais.length === 0 && (
                <span className="text-xs text-muted-foreground">Nenhum canal</span>
              )}
            </div>
          </div>

          {produto.link && (
            <a
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#005DAA] px-4 text-sm font-medium text-white transition-colors hover:bg-[#00497f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA] focus-visible:ring-offset-2 sm:w-auto sm:self-start"
              href={produto.link}
              rel="noreferrer"
              target="_blank"
            >
              Ver anúncio no Mercado Livre
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>

      {(descricao || atributos.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {descricao && (
            <Card>
              <CardHeader>
                <CardTitle className="text-[#00305c]">Descrição</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {descricaoCompleta || !descricaoLonga
                    ? descricao
                    : `${descricao.slice(0, LIMITE_DESCRICAO).trimEnd()}…`}
                </p>
                {descricaoLonga && (
                  <button
                    className="mt-3 text-sm font-medium text-[#005DAA] hover:underline"
                    onClick={() => setDescricaoCompleta((atual) => !atual)}
                    type="button"
                  >
                    {descricaoCompleta ? 'Ver menos' : 'Ver descrição completa'}
                  </button>
                )}
              </CardContent>
            </Card>
          )}

          {atributos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-[#00305c]">Ficha técnica</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="divide-y divide-border overflow-hidden rounded-md border border-border text-sm">
                  {atributosExibidos.map((atributo, indice) => (
                    <div
                      className={cn(
                        'grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 px-3 py-2',
                        indice % 2 === 0 && 'bg-[#005DAA]/5',
                      )}
                      key={`${atributo.nome}-${indice}`}
                    >
                      <dt className="font-medium text-[#00305c]">{atributo.nome}</dt>
                      <dd className="break-words text-muted-foreground">{atributo.valor}</dd>
                    </div>
                  ))}
                </dl>
                {atributos.length > ATRIBUTOS_VISIVEIS && (
                  <button
                    className="mt-3 text-sm font-medium text-[#005DAA] hover:underline"
                    onClick={() => setTodosAtributos((atual) => !atual)}
                    type="button"
                  >
                    {todosAtributos
                      ? 'Ver menos'
                      : `Ver todas as ${atributos.length} características`}
                  </button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </>
  )
}

export function ProdutoDetalhePage() {
  const { id = '' } = useParams()
  const location = useLocation()
  // o catálogo envia os filtros atuais para o "voltar" restaurá-los
  const voltarPara = `/catalogo${(location.state as { busca?: string } | null)?.busca ?? ''}`

  const produtosCadastrados = useProdutosCadastrados()
  const ehLocal = id.startsWith('NOVO-')
  const anuncio = useAnuncioMercadoLivre(id, !ehLocal)

  const produtoLocal = produtosCadastrados.find((produto) => produto.id === id)
  const produto: ProdutoDetalhado | undefined = ehLocal
    ? produtoLocal && {
        id: produtoLocal.id,
        titulo: produtoLocal.nome,
        sku: produtoLocal.sku,
        categoria: produtoLocal.categoria,
        preco: produtoLocal.preco,
        estoque: produtoLocal.estoque,
        vendidos: produtoLocal.vendidos,
        status: STATUS_NAO_PUBLICADO,
        fotos: [produtoLocal.foto],
        canais: produtoLocal.canais,
      }
    : anuncio.data && { ...anuncio.data, canais: ['Mercado Livre'] }

  const codigoErro = axios.isAxiosError<ErroApi>(anuncio.error)
    ? anuncio.error.response?.data.codigo
    : undefined

  return (
    <section className="space-y-6">
      <nav aria-label="Trilha de navegação" className="flex min-w-0 items-center gap-1.5 text-sm">
        <Link className="shrink-0 text-[#005DAA] hover:underline" to="/">
          Início
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <Link className="shrink-0 text-[#005DAA] hover:underline" to={voltarPara}>
          Catálogo
        </Link>
        {produto && (
          <>
            <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate text-muted-foreground">{produto.titulo}</span>
          </>
        )}
      </nav>

      <Link
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-[#005DAA]"
        to={voltarPara}
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Voltar ao catálogo
      </Link>

      {produto ? (
        <ConteudoProduto key={produto.id} produto={produto} />
      ) : !ehLocal && anuncio.isPending ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Carregando produto...</p>
      ) : (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {codigoErro === 'ml_nao_conectado'
              ? 'Conecte sua conta do Mercado Livre em Canais para ver este produto.'
              : codigoErro && codigoErro !== 'recurso_nao_encontrado'
                ? 'Não foi possível carregar o produto agora. Tente novamente.'
                : 'Produto não encontrado.'}
          </p>
          <Link
            className="mt-2 inline-block text-sm font-medium text-[#005DAA] hover:underline"
            to={voltarPara}
          >
            Voltar ao catálogo
          </Link>
        </div>
      )}
    </section>
  )
}
