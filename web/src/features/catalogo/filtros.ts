import { useSearchParams } from 'react-router-dom'

import { LIMITE_ESTOQUE_BAIXO, ROTULOS_STATUS, statusDoProduto, type Produto } from './produtos'

export const ORDENACOES = {
  relevancia: 'Relevância',
  mais_vendidos: 'Mais vendidos',
  menor_preco: 'Menor preço',
  maior_preco: 'Maior preço',
  nome: 'Nome (A–Z)',
} as const

export type Ordenacao = keyof typeof ORDENACOES
export type Visao = 'grade' | 'lista'

export type FiltrosCatalogo = {
  busca: string
  canais: string[]
  categorias: string[]
  status: string[]
  estoqueBaixo: boolean
  precoMin: string
  precoMax: string
  ordem: Ordenacao
  visao: Visao
}

const CHAVES_LISTA = { canais: 'canal', categorias: 'categoria', status: 'status' } as const

// Filtros vivem na URL: voltar da página do produto (ou compartilhar o link)
// mantém exatamente a mesma seleção.
export function useFiltrosCatalogo() {
  const [params, setParams] = useSearchParams()

  const ordem = params.get('ordem')
  const filtros: FiltrosCatalogo = {
    busca: params.get('q') ?? '',
    canais: params.getAll(CHAVES_LISTA.canais),
    categorias: params.getAll(CHAVES_LISTA.categorias),
    status: params.getAll(CHAVES_LISTA.status),
    estoqueBaixo: params.get('estoque') === 'baixo',
    precoMin: params.get('min') ?? '',
    precoMax: params.get('max') ?? '',
    ordem: ordem && ordem in ORDENACOES ? (ordem as Ordenacao) : 'relevancia',
    visao: params.get('visao') === 'lista' ? 'lista' : 'grade',
  }

  function atualizar(alterar: (proximos: URLSearchParams) => void) {
    setParams(
      (atuais) => {
        const proximos = new URLSearchParams(atuais)
        alterar(proximos)
        return proximos
      },
      { replace: true },
    )
  }

  function definirTexto(chave: string, valor: string) {
    atualizar((p) => (valor ? p.set(chave, valor) : p.delete(chave)))
  }

  function alternarItem(campo: keyof typeof CHAVES_LISTA, valor: string) {
    const chave = CHAVES_LISTA[campo]
    atualizar((p) => {
      const atuais = p.getAll(chave)
      p.delete(chave)
      const proximos = atuais.includes(valor)
        ? atuais.filter((item) => item !== valor)
        : [...atuais, valor]
      proximos.forEach((item) => p.append(chave, item))
    })
  }

  return {
    filtros,
    definirBusca: (valor: string) => definirTexto('q', valor),
    definirPrecoMin: (valor: string) => definirTexto('min', valor),
    definirPrecoMax: (valor: string) => definirTexto('max', valor),
    definirOrdem: (valor: Ordenacao) => definirTexto('ordem', valor === 'relevancia' ? '' : valor),
    definirVisao: (valor: Visao) => definirTexto('visao', valor === 'grade' ? '' : valor),
    alternarEstoqueBaixo: () => definirTexto('estoque', filtros.estoqueBaixo ? '' : 'baixo'),
    alternarItem,
    limparPrecos: () =>
      atualizar((p) => {
        p.delete('min')
        p.delete('max')
      }),
    limparTudo: () =>
      atualizar((p) => {
        // ordenação e modo de visualização não são filtros — permanecem
        for (const chave of ['q', 'canal', 'categoria', 'status', 'estoque', 'min', 'max']) {
          p.delete(chave)
        }
      }),
  }
}

function paraNumero(valor: string) {
  const numero = Number(valor.replace(',', '.'))
  return valor.trim() && Number.isFinite(numero) ? numero : null
}

export function aplicarFiltros(produtos: Produto[], filtros: FiltrosCatalogo) {
  const termo = filtros.busca.trim().toLocaleLowerCase('pt-BR')
  const precoMin = paraNumero(filtros.precoMin)
  const precoMax = paraNumero(filtros.precoMax)

  const filtrados = produtos.filter(
    (produto) =>
      (!termo ||
        [produto.nome, produto.sku, produto.categoria].some((valor) =>
          valor.toLocaleLowerCase('pt-BR').includes(termo),
        )) &&
      (filtros.canais.length === 0 ||
        produto.canais.some((canal) => filtros.canais.includes(canal))) &&
      (filtros.categorias.length === 0 || filtros.categorias.includes(produto.categoria)) &&
      (filtros.status.length === 0 || filtros.status.includes(statusDoProduto(produto))) &&
      (!filtros.estoqueBaixo || produto.estoque <= LIMITE_ESTOQUE_BAIXO) &&
      (precoMin === null || produto.preco >= precoMin) &&
      (precoMax === null || produto.preco <= precoMax),
  )

  const comparadores: Record<Ordenacao, ((a: Produto, b: Produto) => number) | null> = {
    relevancia: null,
    mais_vendidos: (a, b) => b.vendidos - a.vendidos,
    menor_preco: (a, b) => a.preco - b.preco,
    maior_preco: (a, b) => b.preco - a.preco,
    nome: (a, b) => a.nome.localeCompare(b.nome, 'pt-BR'),
  }
  const comparar = comparadores[filtros.ordem]
  return comparar ? [...filtrados].sort(comparar) : filtrados
}

export type ChipFiltro = { chave: string; rotulo: string; remover: () => void }

export function chipsDosFiltros(
  filtros: FiltrosCatalogo,
  acoes: ReturnType<typeof useFiltrosCatalogo>,
): ChipFiltro[] {
  const chips: ChipFiltro[] = []
  if (filtros.busca) {
    chips.push({ chave: 'q', rotulo: `"${filtros.busca}"`, remover: () => acoes.definirBusca('') })
  }
  if (filtros.estoqueBaixo) {
    chips.push({ chave: 'estoque', rotulo: 'Estoque baixo', remover: acoes.alternarEstoqueBaixo })
  }
  filtros.canais.forEach((canal) =>
    chips.push({
      chave: `canal-${canal}`,
      rotulo: canal,
      remover: () => acoes.alternarItem('canais', canal),
    }),
  )
  filtros.categorias.forEach((categoria) =>
    chips.push({
      chave: `categoria-${categoria}`,
      rotulo: categoria,
      remover: () => acoes.alternarItem('categorias', categoria),
    }),
  )
  filtros.status.forEach((status) =>
    chips.push({
      chave: `status-${status}`,
      rotulo: ROTULOS_STATUS[status] ?? status,
      remover: () => acoes.alternarItem('status', status),
    }),
  )
  if (filtros.precoMin || filtros.precoMax) {
    const de = filtros.precoMin ? `R$ ${filtros.precoMin}` : 'R$ 0'
    const ate = filtros.precoMax ? `R$ ${filtros.precoMax}` : '∞'
    chips.push({ chave: 'preco', rotulo: `${de} – ${ate}`, remover: acoes.limparPrecos })
  }
  return chips
}
