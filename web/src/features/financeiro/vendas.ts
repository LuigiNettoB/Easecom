import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { useAnunciosMercadoLivre, type Produto } from '@/features/catalogo/produtos'
import { api } from '@/shared/api/client'
import type { PedidoMercadoLivre } from '@/shared/api/types'

export type StatusVenda = 'pago' | 'enviado' | 'entregue' | 'cancelado' | 'devolvido'

export type ItemVenda = {
  produtoId: string
  titulo: string
  categoria: string
  quantidade: number
  precoUnitario: number
  tarifa: number
}

export type Venda = {
  id: string
  data: Date
  canal: string
  status: StatusVenda
  total: number
  comprador: string
  formaPagamento: string
  parcelas: number
  itens: ItemVenda[]
  // custo de frete arcado pelo vendedor
  frete: number
  // false = gerada para demonstração
  real: boolean
}

export const ROTULOS_STATUS_VENDA: Record<StatusVenda, string> = {
  pago: 'Pago',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
  devolvido: 'Devolvido',
}

export const ESTILOS_STATUS_VENDA: Record<StatusVenda, { badge: string; barra: string }> = {
  pago: { badge: 'bg-[#85FA51]/25 text-[#1f5c0a]', barra: '#85FA51' },
  enviado: { badge: 'bg-[#005DAA]/10 text-[#005DAA]', barra: '#005DAA' },
  entregue: { badge: 'bg-[#00305c]/10 text-[#00305c]', barra: '#00305c' },
  devolvido: { badge: 'bg-amber-100 text-amber-800', barra: '#f59e0b' },
  cancelado: { badge: 'bg-red-100 text-red-800', barra: '#dc2626' },
}

const FORMAS_PAGAMENTO_ML: Record<string, string> = {
  account_money: 'Saldo Mercado Pago',
  credit_card: 'Cartão de crédito',
  debit_card: 'Cartão de débito',
  ticket: 'Boleto',
  bank_transfer: 'Pix',
  digital_currency: 'Linha de crédito',
}

const STATUS_ML: Record<string, StatusVenda> = {
  paid: 'pago',
  confirmed: 'pago',
  partially_paid: 'pago',
  cancelled: 'cancelado',
  invalid: 'cancelado',
}

function pedidoParaVenda(pedido: PedidoMercadoLivre): Venda {
  return {
    id: pedido.id,
    data: new Date(pedido.data),
    canal: 'Mercado Livre',
    status: STATUS_ML[pedido.status] ?? 'pago',
    total: pedido.total,
    comprador: pedido.comprador,
    formaPagamento: FORMAS_PAGAMENTO_ML[pedido.forma_pagamento] ?? 'Outros',
    parcelas: pedido.parcelas,
    itens: pedido.itens.map((item) => ({
      produtoId: item.anuncio_id,
      titulo: item.titulo,
      categoria: item.categoria,
      quantidade: item.quantidade,
      precoUnitario: item.preco_unitario,
      tarifa: item.tarifa * item.quantidade,
    })),
    frete: 0,
    real: true,
  }
}

export function usePedidosMercadoLivre() {
  return useQuery({
    queryKey: ['canais', 'mercado-livre', 'pedidos'],
    queryFn: async () => {
      const { data } = await api.get<{ pedidos: PedidoMercadoLivre[] }>(
        '/canais/mercado-livre/pedidos',
      )
      return data.pedidos.map(pedidoParaVenda)
    },
  })
}

// --- Histórico de demonstração ------------------------------------------------
//
// A conta de teste do Mercado Livre só tem um punhado de pedidos, todos do mesmo
// dia — pouco para enxergar tendência. Este gerador cria um histórico fictício
// (mas determinístico: mesma semente, mesmos números a cada carregamento) usando
// os produtos reais do catálogo.

const INICIO_HISTORICO = new Date(2024, 0, 1)

const CANAIS: [string, number, number][] = [
  // canal, peso, tarifa sobre o valor
  ['Mercado Livre', 0.58, 0.13],
  ['Shopee', 0.2, 0.14],
  ['Amazon', 0.13, 0.12],
  ['Magalu', 0.09, 0.16],
]

const PAGAMENTOS: [string, number][] = [
  ['Cartão de crédito', 0.46],
  ['Pix', 0.33],
  ['Saldo Mercado Pago', 0.1],
  ['Boleto', 0.06],
  ['Cartão de débito', 0.05],
]

// 8h..22h — pico no almoço e à noite, como costuma ser no e-commerce
const PESOS_HORA: [number, number][] = [
  [8, 0.5],
  [9, 0.7],
  [10, 0.9],
  [11, 1.1],
  [12, 1.5],
  [13, 1.4],
  [14, 1.0],
  [15, 0.9],
  [16, 0.9],
  [17, 1.0],
  [18, 1.2],
  [19, 1.6],
  [20, 1.9],
  [21, 1.8],
  [22, 1.1],
]

// domingo..sábado
const FATOR_DIA_DA_SEMANA = [0.78, 1.14, 1.1, 1.05, 1.02, 0.96, 0.85]
// jan..dez — novembro carrega a Black Friday
const FATOR_MES = [0.86, 0.82, 0.92, 0.9, 1.02, 0.95, 0.94, 0.98, 0.97, 1.04, 1.62, 1.38]

const NOMES = [
  'Ana',
  'Bruno',
  'Carla',
  'Diego',
  'Elisa',
  'Felipe',
  'Gabriela',
  'Henrique',
  'Isabela',
  'João',
  'Larissa',
  'Marcos',
  'Natália',
  'Otávio',
  'Paula',
  'Rafael',
  'Sofia',
  'Thiago',
  'Beatriz',
  'Caio',
  'Daniela',
  'Eduardo',
  'Fernanda',
  'Gustavo',
  'Helena',
  'Igor',
  'Juliana',
  'Leonardo',
  'Mariana',
  'Nicolas',
  'Priscila',
  'Renato',
  'Tatiane',
  'Vinícius',
  'Yasmin',
  'Lucas',
  'Camila',
  'Pedro',
  'Letícia',
  'André',
]
const SOBRENOMES = [
  'Oliveira',
  'Santos',
  'Mendes',
  'Lima',
  'Rocha',
  'Costa',
  'Alves',
  'Souza',
  'Ferreira',
  'Pereira',
  'Gomes',
  'Ribeiro',
  'Carvalho',
  'Martins',
  'Barbosa',
  'Araújo',
  'Cardoso',
  'Nascimento',
  'Teixeira',
  'Moreira',
  'Cavalcanti',
  'Dias',
  'Freitas',
  'Monteiro',
  'Pinto',
  'Ramos',
  'Vieira',
  'Azevedo',
  'Correia',
  'Fonseca',
  'Machado',
  'Nunes',
  'Batista',
  'Campos',
]

const PRODUTOS_RESERVA: Pick<Produto, 'id' | 'nome' | 'categoria' | 'preco'>[] = [
  { id: 'DEMO-1', nome: 'Fone Bluetooth Sem Fio', categoria: 'Fones de Ouvido', preco: 139.9 },
  { id: 'DEMO-2', nome: 'Mousepad Gamer 90x40cm', categoria: 'Mouse Pads', preco: 49.9 },
  { id: 'DEMO-3', nome: 'Cabo HDMI 10m 4K', categoria: 'Áudio e Vídeo', preco: 29.9 },
  { id: 'DEMO-4', nome: 'Hub USB-C 7 em 1', categoria: 'Hubs USB', preco: 89.9 },
  { id: 'DEMO-5', nome: 'Mochila Executiva Notebook', categoria: 'Mochilas', preco: 129.9 },
]

function criarAleatorio(semente: number) {
  // mulberry32
  let estado = semente
  return () => {
    estado = (estado + 0x6d2b79f5) | 0
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function sortearPonderado<T>(opcoes: [T, number, ...unknown[]][], valor: number) {
  const total = opcoes.reduce((soma, [, peso]) => soma + peso, 0)
  let acumulado = 0
  for (const opcao of opcoes) {
    acumulado += opcao[1] / total
    if (valor <= acumulado) return opcao
  }
  return opcoes[opcoes.length - 1]
}

const centavos = (valor: number) => Math.round(valor * 100) / 100

export function gerarVendasDemonstracao(
  produtosCatalogo: Pick<Produto, 'id' | 'nome' | 'categoria' | 'preco'>[],
  hoje: Date,
): Venda[] {
  const aleatorio = criarAleatorio(20260907)
  const produtos = produtosCatalogo.length > 0 ? produtosCatalogo : PRODUTOS_RESERVA
  // produtos baratos giram mais que os caros
  const pesosProdutos = produtos.map((p) => [p, 1 / Math.sqrt(p.preco)] as [typeof p, number])

  const vendas: Venda[] = []
  const totalDias = Math.floor((hoje.getTime() - INICIO_HISTORICO.getTime()) / 86_400_000)
  let sequencia = 41_000

  for (let dia = 0; dia <= totalDias; dia++) {
    const data = new Date(INICIO_HISTORICO)
    data.setDate(data.getDate() + dia)
    const crescimento = 2.2 + 5.5 * (dia / Math.max(totalDias, 1))
    const esperado = crescimento * FATOR_DIA_DA_SEMANA[data.getDay()] * FATOR_MES[data.getMonth()]
    const quantidadePedidos = Math.round(esperado * (0.6 + aleatorio() * 0.8))
    const idadeEmDias = totalDias - dia

    for (let n = 0; n < quantidadePedidos; n++) {
      const momento = new Date(data)
      momento.setHours(sortearPonderado(PESOS_HORA, aleatorio())[0], Math.floor(aleatorio() * 60))
      if (momento > hoje) continue

      const [canal, , taxaCanal] = sortearPonderado(CANAIS, aleatorio()) as [string, number, number]
      const itens: ItemVenda[] = []
      const quantidadeItens = aleatorio() < 0.82 ? 1 : 2
      for (let i = 0; i < quantidadeItens; i++) {
        const [produto] = sortearPonderado(pesosProdutos, aleatorio())
        if (itens.some((item) => item.produtoId === produto.id)) continue
        const quantidade = aleatorio() < 0.75 ? 1 : aleatorio() < 0.7 ? 2 : 3
        itens.push({
          produtoId: produto.id,
          titulo: produto.nome,
          categoria: produto.categoria,
          quantidade,
          precoUnitario: produto.preco,
          tarifa: centavos(produto.preco * quantidade * taxaCanal),
        })
      }
      const total = centavos(itens.reduce((s, i) => s + i.precoUnitario * i.quantidade, 0))

      const sorteioStatus = aleatorio()
      const status: StatusVenda =
        sorteioStatus < 0.04
          ? 'cancelado'
          : sorteioStatus < 0.065 && idadeEmDias > 7
            ? 'devolvido'
            : idadeEmDias <= 2
              ? 'pago'
              : idadeEmDias <= 6
                ? 'enviado'
                : 'entregue'

      const pagamentos =
        canal === 'Mercado Livre'
          ? PAGAMENTOS
          : PAGAMENTOS.filter(([f]) => f !== 'Saldo Mercado Pago')
      const [formaPagamento] = sortearPonderado(pagamentos, aleatorio())

      vendas.push({
        id: `DEMO-${sequencia++}`,
        data: momento,
        canal,
        status,
        total,
        comprador: `${NOMES[Math.floor(aleatorio() * NOMES.length)]} ${SOBRENOMES[Math.floor(aleatorio() * SOBRENOMES.length)]}`,
        formaPagamento,
        parcelas: formaPagamento === 'Cartão de crédito' ? 1 + Math.floor(aleatorio() * 6) : 1,
        itens,
        // frete grátis acima de R$ 79 sai do bolso do vendedor
        frete: total >= 79 ? centavos(16 + aleatorio() * 12) : 0,
        real: false,
      })
    }
  }
  return vendas
}

// Vendas reais do Mercado Livre + (opcionalmente) o histórico de demonstração,
// mais recentes primeiro. Compartilhado entre Início e Financeiro.
export function useVendas(incluirDemonstracao: boolean) {
  const anuncios = useAnunciosMercadoLivre()
  const pedidosReais = usePedidosMercadoLivre()

  const hoje = useMemo(() => new Date(), [])
  const catalogoPronto = !anuncios.isPending
  const vendasDemonstracao = useMemo(
    () =>
      catalogoPronto
        ? gerarVendasDemonstracao(
            // anúncios em revisão/pausados não podem ser vendidos
            (anuncios.data ?? [])
              .filter((p) => p.status === 'active')
              .map((p) => ({ id: p.id, nome: p.nome, categoria: p.categoria, preco: p.preco })),
            hoje,
          )
        : [],
    [anuncios.data, catalogoPronto, hoje],
  )
  const reais = useMemo(() => pedidosReais.data ?? [], [pedidosReais.data])
  const vendas = useMemo(
    () =>
      (incluirDemonstracao ? [...reais, ...vendasDemonstracao] : reais).sort(
        (a, b) => b.data.getTime() - a.data.getTime(),
      ),
    [incluirDemonstracao, reais, vendasDemonstracao],
  )

  return {
    hoje,
    vendas,
    reais,
    anuncios,
    pedidosReais,
    carregando: !catalogoPronto || pedidosReais.isPending,
  }
}
