import type { Produto } from '@/features/catalogo/produtos'

import type { StatusVenda, Venda } from './vendas'

export const PERIODOS = { '7d': 7, '30d': 30, '90d': 90, '12m': 365 } as const
export type Periodo = keyof typeof PERIODOS

export type Granularidade = 'semanal' | 'mensal' | 'anual'

const DIA_MS = 86_400_000

function fimDoDia(data: Date) {
  const fim = new Date(data)
  fim.setHours(23, 59, 59, 999)
  return fim
}

export function intervaloDoPeriodo(periodo: Periodo, hoje: Date) {
  const fim = fimDoDia(hoje)
  const inicio = new Date(fim.getTime() - PERIODOS[periodo] * DIA_MS + 1)
  const inicioAnterior = new Date(inicio.getTime() - PERIODOS[periodo] * DIA_MS)
  return { inicio, fim, inicioAnterior }
}

export function vendasEntre(vendas: Venda[], inicio: Date, fim: Date) {
  return vendas.filter((venda) => venda.data >= inicio && venda.data <= fim)
}

const conta = (venda: Venda) => venda.status !== 'cancelado'
const unidades = (venda: Venda) => venda.itens.reduce((soma, item) => soma + item.quantidade, 0)
const tarifas = (venda: Venda) => venda.itens.reduce((soma, item) => soma + item.tarifa, 0)

export type Indicadores = {
  faturamento: number
  pedidos: number
  ticketMedio: number
  receitaLiquida: number
  unidades: number
  itensPorPedido: number
  tarifas: number
  frete: number
  devolucoes: number
  taxaCancelamentoDevolucao: number
}

export function calcularIndicadores(vendas: Venda[]): Indicadores {
  const validas = vendas.filter(conta)
  const faturamento = validas.reduce((soma, venda) => soma + venda.total, 0)
  const devolucoes = validas
    .filter((venda) => venda.status === 'devolvido')
    .reduce((soma, venda) => soma + venda.total, 0)
  const totalTarifas = validas.reduce((soma, venda) => soma + tarifas(venda), 0)
  const frete = validas.reduce((soma, venda) => soma + venda.frete, 0)
  const totalUnidades = validas.reduce((soma, venda) => soma + unidades(venda), 0)
  const perdidas = vendas.filter((v) => v.status === 'cancelado' || v.status === 'devolvido')

  return {
    faturamento,
    pedidos: validas.length,
    ticketMedio: validas.length ? faturamento / validas.length : 0,
    receitaLiquida: faturamento - devolucoes - totalTarifas - frete,
    unidades: totalUnidades,
    itensPorPedido: validas.length ? totalUnidades / validas.length : 0,
    tarifas: totalTarifas,
    frete,
    devolucoes,
    taxaCancelamentoDevolucao: vendas.length ? perdidas.length / vendas.length : 0,
  }
}

// variação relativa; null quando não há base de comparação
export function variacao(atual: number, anterior: number) {
  return anterior > 0 ? (atual - anterior) / anterior : null
}

export type PontoSerie = {
  chave: string
  rotulo: string
  rotuloCompleto: string
  faturamento: number
  pedidos: number
}

const mesCurto = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
const mesLongo = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
const diaMes = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' })
const dataCompleta = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

function inicioDaSemana(data: Date) {
  const inicio = new Date(data)
  inicio.setHours(0, 0, 0, 0)
  // semana começando na segunda-feira
  inicio.setDate(inicio.getDate() - ((inicio.getDay() + 6) % 7))
  return inicio
}

const semPonto = (texto: string) => texto.replace('.', '')

export function serieTemporal(vendas: Venda[], granularidade: Granularidade, hoje: Date) {
  const pontos: PontoSerie[] = []
  const indice = new Map<string, PontoSerie>()
  const adicionar = (ponto: Omit<PontoSerie, 'faturamento' | 'pedidos'>) => {
    const completo = { ...ponto, faturamento: 0, pedidos: 0 }
    pontos.push(completo)
    indice.set(ponto.chave, completo)
  }

  let chaveDe: (data: Date) => string
  if (granularidade === 'semanal') {
    const atual = inicioDaSemana(hoje)
    for (let i = 11; i >= 0; i--) {
      const inicio = new Date(atual)
      inicio.setDate(inicio.getDate() - i * 7)
      const fim = new Date(inicio)
      fim.setDate(fim.getDate() + 6)
      adicionar({
        chave: inicio.toDateString(),
        rotulo: `${diaMes.format(inicio)}${i === 0 ? '*' : ''}`,
        rotuloCompleto: `${dataCompleta.format(inicio)} – ${dataCompleta.format(fim)}${i === 0 ? ' (parcial)' : ''}`,
      })
    }
    chaveDe = (data) => inicioDaSemana(data).toDateString()
  } else if (granularidade === 'mensal') {
    for (let i = 11; i >= 0; i--) {
      const mes = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
      const nome = semPonto(mesCurto.format(mes))
      adicionar({
        chave: `${mes.getFullYear()}-${mes.getMonth()}`,
        rotulo:
          (mes.getMonth() === 0 || i === 11
            ? `${nome}/${String(mes.getFullYear()).slice(2)}`
            : nome) + (i === 0 ? '*' : ''),
        rotuloCompleto: `${mesLongo.format(mes)}${i === 0 ? ' (parcial)' : ''}`,
      })
    }
    chaveDe = (data) => `${data.getFullYear()}-${data.getMonth()}`
  } else {
    const primeiro = Math.min(...vendas.map((v) => v.data.getFullYear()), hoje.getFullYear())
    for (let ano = primeiro; ano <= hoje.getFullYear(); ano++) {
      adicionar({
        chave: String(ano),
        rotulo: ano === hoje.getFullYear() ? `${ano}*` : String(ano),
        rotuloCompleto: ano === hoje.getFullYear() ? `${ano} (parcial)` : String(ano),
      })
    }
    chaveDe = (data) => String(data.getFullYear())
  }

  for (const venda of vendas) {
    if (!conta(venda)) continue
    const ponto = indice.get(chaveDe(venda.data))
    if (ponto) {
      ponto.faturamento += venda.total
      ponto.pedidos += 1
    }
  }
  return pontos
}

export type Fatia = { rotulo: string; valor: number; outros?: boolean }

export function agruparPor(
  vendas: Venda[],
  chave: (venda: Venda) => string,
  valor: (venda: Venda) => number = (venda) => venda.total,
) {
  const grupos = new Map<string, number>()
  for (const venda of vendas.filter(conta)) {
    grupos.set(chave(venda), (grupos.get(chave(venda)) ?? 0) + valor(venda))
  }
  return [...grupos.entries()]
    .map(([rotulo, total]) => ({ rotulo, valor: total }))
    .sort((a, b) => b.valor - a.valor)
}

export function faturamentoPorCategoria(vendas: Venda[], maximo = 5): Fatia[] {
  const grupos = new Map<string, number>()
  for (const venda of vendas.filter(conta)) {
    for (const item of venda.itens) {
      grupos.set(
        item.categoria,
        (grupos.get(item.categoria) ?? 0) + item.precoUnitario * item.quantidade,
      )
    }
  }
  const ordenadas = [...grupos.entries()]
    .map(([rotulo, valor]) => ({ rotulo, valor }))
    .sort((a, b) => b.valor - a.valor)
  if (ordenadas.length <= maximo + 1) return ordenadas
  const resto = ordenadas.slice(maximo).reduce((soma, fatia) => soma + fatia.valor, 0)
  return [...ordenadas.slice(0, maximo), { rotulo: 'Outras', valor: resto, outros: true }]
}

export type ProdutoVendido = {
  produtoId: string
  titulo: string
  categoria: string
  unidades: number
  faturamento: number
}

export function produtosMaisVendidos(vendas: Venda[], maximo = 5): ProdutoVendido[] {
  const produtos = new Map<string, ProdutoVendido>()
  for (const venda of vendas.filter(conta)) {
    for (const item of venda.itens) {
      const atual = produtos.get(item.produtoId) ?? {
        produtoId: item.produtoId,
        titulo: item.titulo,
        categoria: item.categoria,
        unidades: 0,
        faturamento: 0,
      }
      atual.unidades += item.quantidade
      atual.faturamento += item.precoUnitario * item.quantidade
      produtos.set(item.produtoId, atual)
    }
  }
  return [...produtos.values()].sort((a, b) => b.unidades - a.unidades).slice(0, maximo)
}

const DIAS_DA_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export function pedidosPorDiaDaSemana(vendas: Venda[]) {
  const contagem = DIAS_DA_SEMANA.map((rotulo) => ({ rotulo, valor: 0 }))
  for (const venda of vendas.filter(conta)) {
    contagem[(venda.data.getDay() + 6) % 7].valor += 1
  }
  return contagem
}

export function pedidosPorStatus(vendas: Venda[]) {
  const ordem: StatusVenda[] = ['pago', 'enviado', 'entregue', 'devolvido', 'cancelado']
  return ordem.map((status) => ({
    status,
    valor: vendas.filter((venda) => venda.status === status).length,
  }))
}

export type CoberturaEstoque = {
  produto: Produto
  vendasPorDia: number
  // null = sem vendas recentes, estoque "infinito" no ritmo atual
  diasRestantes: number | null
}

export function coberturaDeEstoque(produtos: Produto[], vendas: Venda[], hoje: Date) {
  const inicio = new Date(fimDoDia(hoje).getTime() - 30 * DIA_MS)
  const vendidas = new Map<string, number>()
  for (const venda of vendasEntre(vendas, inicio, fimDoDia(hoje)).filter(conta)) {
    for (const item of venda.itens) {
      vendidas.set(item.produtoId, (vendidas.get(item.produtoId) ?? 0) + item.quantidade)
    }
  }
  return produtos
    .map((produto): CoberturaEstoque => {
      const vendasPorDia = (vendidas.get(produto.id) ?? 0) / 30
      return {
        produto,
        vendasPorDia,
        diasRestantes: vendasPorDia > 0 ? produto.estoque / vendasPorDia : null,
      }
    })
    .sort((a, b) => (a.diasRestantes ?? Infinity) - (b.diasRestantes ?? Infinity))
}
