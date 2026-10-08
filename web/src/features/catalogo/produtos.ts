import { useSyncExternalStore } from 'react'
import { useQuery } from '@tanstack/react-query'

import { api } from '@/shared/api/client'
import type { AnuncioMercadoLivre, AnuncioMercadoLivreDetalhe } from '@/shared/api/types'

export type Produto = {
  id: string
  nome: string
  sku: string
  categoria: string
  preco: number
  estoque: number
  vendidos: number
  canais: string[]
  foto: string
  // presentes só nos anúncios vindos do Mercado Livre
  link?: string
  status?: string
}

export const CANAIS_DISPONIVEIS = ['Mercado Livre', 'Shopee', 'Amazon', 'Magalu']

export const LIMITE_ESTOQUE_BAIXO = 10

export const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export const STATUS_NAO_PUBLICADO = 'nao_publicado'

export const ROTULOS_STATUS: Record<string, string> = {
  active: 'Ativo',
  under_review: 'Em revisão',
  paused: 'Pausado',
  closed: 'Finalizado',
  inactive: 'Inativo',
  [STATUS_NAO_PUBLICADO]: 'Não publicado',
}

export function statusDoProduto(produto: Produto) {
  return produto.status ?? STATUS_NAO_PUBLICADO
}

function anuncioParaProduto(anuncio: AnuncioMercadoLivre): Produto {
  return {
    id: anuncio.id,
    nome: anuncio.titulo,
    sku: anuncio.sku,
    categoria: anuncio.categoria,
    preco: anuncio.preco,
    estoque: anuncio.estoque,
    vendidos: anuncio.vendidos,
    canais: ['Mercado Livre'],
    foto: anuncio.foto,
    link: anuncio.link,
    status: anuncio.status,
  }
}

export function useAnunciosMercadoLivre() {
  return useQuery({
    queryKey: ['canais', 'mercado-livre', 'anuncios'],
    queryFn: async () => {
      const { data } = await api.get<{ anuncios: AnuncioMercadoLivre[] }>(
        '/canais/mercado-livre/anuncios',
      )
      return data.anuncios.map(anuncioParaProduto)
    },
  })
}

export function useAnuncioMercadoLivre(id: string, habilitado: boolean) {
  return useQuery({
    queryKey: ['canais', 'mercado-livre', 'anuncios', id],
    queryFn: async () => {
      const { data } = await api.get<AnuncioMercadoLivreDetalhe>(
        `/canais/mercado-livre/anuncios/${encodeURIComponent(id)}`,
      )
      return data
    },
    enabled: habilitado,
  })
}

// Produtos cadastrados pelo formulário ainda não têm backend: ficam em memória
// enquanto a aba estiver aberta, sobrevivendo à navegação entre catálogo e detalhe.
let produtosCadastrados: Produto[] = []
const ouvintes = new Set<() => void>()

export function cadastrarProdutoLocal(produto: Produto) {
  produtosCadastrados = [produto, ...produtosCadastrados]
  ouvintes.forEach((ouvinte) => ouvinte())
}

export function useProdutosCadastrados() {
  return useSyncExternalStore(
    (ouvinte) => {
      ouvintes.add(ouvinte)
      return () => ouvintes.delete(ouvinte)
    },
    () => produtosCadastrados,
  )
}
