import type { Produto } from '@/features/catalogo/produtos'
import type { Venda } from '@/features/financeiro/vendas'

const DIA_MS = 86_400_000
const conta = (venda: Venda) => venda.status !== 'cancelado'

function inicioDoDia(data: Date) {
  const inicio = new Date(data)
  inicio.setHours(0, 0, 0, 0)
  return inicio
}

function mesmoDia(a: Date, b: Date) {
  return inicioDoDia(a).getTime() === inicioDoDia(b).getTime()
}

// --- Ritmo do dia: hoje x um dia típico -----------------------------------------

export type PontoRitmo = { hora: number; hoje: number | null; tipico: number }

const SEMANAS_DE_REFERENCIA = 4

// Faturamento acumulado hora a hora: hoje contra a média dos últimos quatro
// dias iguais da semana (terça com terça) — compara ritmo, não só o total.
export function ritmoDoDia(vendas: Venda[], hoje: Date) {
  const acumular = (doDia: Venda[]) => {
    const porHora = Array.from({ length: 24 }, () => 0)
    for (const venda of doDia.filter(conta)) porHora[venda.data.getHours()] += venda.total
    let soma = 0
    return porHora.map((valor) => (soma += valor))
  }

  const deHoje = vendas.filter((venda) => mesmoDia(venda.data, hoje))
  const referencias = Array.from({ length: SEMANAS_DE_REFERENCIA }, (_, semana) => {
    const dia = new Date(inicioDoDia(hoje).getTime() - (semana + 1) * 7 * DIA_MS)
    return acumular(vendas.filter((venda) => mesmoDia(venda.data, dia)))
  })
  const acumuladoHoje = acumular(deHoje)
  const horaAtual = hoje.getHours()

  const pontos: PontoRitmo[] = acumuladoHoje.map((valor, hora) => ({
    hora,
    hoje: hora <= horaAtual ? valor : null,
    tipico: referencias.reduce((soma, ref) => soma + ref[hora], 0) / referencias.length,
  }))

  const pedidosHoje = deHoje.filter(conta).length
  const faturamentoHoje = acumuladoHoje[horaAtual]
  const tipicoAteAgora = pontos[horaAtual].tipico
  const pedidosTipicosAteAgora =
    Array.from({ length: SEMANAS_DE_REFERENCIA }, (_, semana) => {
      const dia = new Date(inicioDoDia(hoje).getTime() - (semana + 1) * 7 * DIA_MS)
      return vendas.filter(
        (venda) => conta(venda) && mesmoDia(venda.data, dia) && venda.data.getHours() <= horaAtual,
      ).length
    }).reduce((a, b) => a + b, 0) / SEMANAS_DE_REFERENCIA

  return {
    pontos,
    faturamentoHoje,
    pedidosHoje,
    ticketHoje: pedidosHoje ? faturamentoHoje / pedidosHoje : 0,
    tipicoAteAgora,
    pedidosTipicosAteAgora,
    tipicoDiaInteiro: pontos[23].tipico,
  }
}

// --- Meta do mês ------------------------------------------------------------------

export function resumoDoMes(vendas: Venda[], hoje: Date) {
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
  const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate()
  // fração do mês já percorrida (contando as horas de hoje)
  const decorrido = (hoje.getTime() - inicioMes.getTime()) / DIA_MS

  const soma = (de: Date, ate: Date) =>
    vendas
      .filter((v) => conta(v) && v.data >= de && v.data < ate)
      .reduce((total, v) => total + v.total, 0)

  const faturamento = soma(inicioMes, new Date(hoje.getTime() + 1))
  const mesAnterior = soma(inicioMesAnterior, inicioMes)
  return {
    faturamento,
    mesAnterior,
    diasNoMes,
    diaAtual: hoje.getDate(),
    projecao: decorrido > 0 ? (faturamento / decorrido) * diasNoMes : 0,
    fracaoDecorrida: decorrido / diasNoMes,
    // sugestão inicial: 10% acima do mês passado, arredondado para R$ 5 mil
    metaSugerida: Math.max(Math.ceil((mesAnterior * 1.1) / 5000) * 5000, 5000),
  }
}

// --- Mapa de calor: dia da semana x hora ---------------------------------------------

export const HORAS_MAPA = Array.from({ length: 15 }, (_, i) => i + 8) // 8h..22h
export const DIAS_MAPA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export function mapaDeCalor(vendas: Venda[], hoje: Date, semanas = 8) {
  const inicio = new Date(inicioDoDia(hoje).getTime() - semanas * 7 * DIA_MS)
  const matriz = DIAS_MAPA.map(() => HORAS_MAPA.map(() => 0))
  for (const venda of vendas) {
    if (!conta(venda) || venda.data < inicio || venda.data > hoje) continue
    const coluna = HORAS_MAPA.indexOf(venda.data.getHours())
    if (coluna >= 0) matriz[(venda.data.getDay() + 6) % 7][coluna] += 1
  }
  let pico = { dia: 0, hora: 0, valor: 0 }
  matriz.forEach((linha, dia) =>
    linha.forEach((valor, coluna) => {
      if (valor > pico.valor) pico = { dia, hora: HORAS_MAPA[coluna], valor }
    }),
  )
  return { matriz, pico, semanas }
}

// --- Pendências -----------------------------------------------------------------------

export type Pendencia = {
  chave: string
  titulo: string
  descricao: string
  quantidade: number
  gravidade: 'critica' | 'atencao'
  rota: string
  acao: string
}

export function pendencias(vendas: Venda[], produtos: Produto[], hoje: Date): Pendencia[] {
  const aguardandoEnvio = vendas.filter((v) => v.status === 'pago')
  const atrasados = aguardandoEnvio.filter((v) => hoje.getTime() - v.data.getTime() > DIA_MS)

  const inicio30 = new Date(hoje.getTime() - 30 * DIA_MS)
  const vendidas = new Map<string, number>()
  for (const venda of vendas.filter((v) => conta(v) && v.data >= inicio30)) {
    for (const item of venda.itens) {
      vendidas.set(item.produtoId, (vendidas.get(item.produtoId) ?? 0) + item.quantidade)
    }
  }
  const estoqueCritico = produtos.filter((produto) => {
    const porDia = (vendidas.get(produto.id) ?? 0) / 30
    return produto.status === 'active' && porDia > 0 && produto.estoque / porDia < 7
  })
  const emRevisao = produtos.filter((produto) => produto.status === 'under_review')
  const devolucoes = vendas.filter(
    (v) => v.status === 'devolvido' && hoje.getTime() - v.data.getTime() < 7 * DIA_MS * 2,
  )

  const lista: Pendencia[] = [
    {
      chave: 'envio',
      titulo: 'Pedidos aguardando envio',
      descricao: atrasados.length
        ? `${atrasados.length} pagos há mais de 24 h — risco de atraso`
        : 'Pagos e prontos para despachar',
      quantidade: aguardandoEnvio.length,
      gravidade: atrasados.length ? 'critica' : 'atencao',
      rota: '/pedidos',
      acao: 'Ver pedidos',
    },
    {
      chave: 'estoque',
      titulo: 'Estoque acabando',
      descricao: estoqueCritico.length
        ? `${estoqueCritico.map((p) => p.nome.split(' ').slice(0, 3).join(' ')).join(', ')} — menos de 7 dias`
        : '',
      quantidade: estoqueCritico.length,
      gravidade: 'critica',
      rota: '/catalogo?estoque=baixo',
      acao: 'Repor estoque',
    },
    {
      chave: 'revisao',
      titulo: 'Anúncios em revisão no Mercado Livre',
      descricao: 'Não aparecem para compradores até serem aprovados',
      quantidade: emRevisao.length,
      gravidade: 'atencao',
      rota: '/catalogo?status=under_review',
      acao: 'Revisar anúncios',
    },
    {
      chave: 'devolucoes',
      titulo: 'Devoluções recentes',
      descricao: 'Nos últimos 14 dias — confira o motivo e o estoque de volta',
      quantidade: devolucoes.length,
      gravidade: 'atencao',
      rota: '/pedidos',
      acao: 'Ver devoluções',
    },
  ]
  return lista.filter((item) => item.quantidade > 0)
}

// --- Feed de atividade ----------------------------------------------------------------

export type EventoFeed = {
  chave: string
  tipo: 'venda' | 'envio' | 'devolucao' | 'cancelamento'
  data: Date
  venda: Venda
}

export function feedDeAtividade(vendas: Venda[], maximo = 7): EventoFeed[] {
  return vendas.slice(0, maximo).map((venda) => ({
    chave: venda.id,
    tipo:
      venda.status === 'cancelado'
        ? 'cancelamento'
        : venda.status === 'devolvido'
          ? 'devolucao'
          : venda.status === 'enviado'
            ? 'envio'
            : 'venda',
    data: venda.data,
    venda,
  }))
}

// --- Produto destaque da semana ------------------------------------------------------------

export function produtoDestaque(vendas: Venda[], produtos: Produto[], hoje: Date) {
  const fim = inicioDoDia(hoje).getTime() + DIA_MS
  const unidadesPorDia = new Map<string, number[]>()
  for (const venda of vendas) {
    const diasAtras = Math.floor((fim - venda.data.getTime()) / DIA_MS)
    if (!conta(venda) || diasAtras < 0 || diasAtras >= 14) continue
    for (const item of venda.itens) {
      const serie = unidadesPorDia.get(item.produtoId) ?? Array.from({ length: 14 }, () => 0)
      serie[13 - diasAtras] += item.quantidade
      unidadesPorDia.set(item.produtoId, serie)
    }
  }

  let melhor: { produto: Produto; serie: number[]; semana: number; anterior: number } | null = null
  for (const produto of produtos) {
    const serie = unidadesPorDia.get(produto.id)
    if (!serie) continue
    const semana = serie.slice(7).reduce((a, b) => a + b, 0)
    if (!melhor || semana > melhor.semana) {
      melhor = { produto, serie, semana, anterior: serie.slice(0, 7).reduce((a, b) => a + b, 0) }
    }
  }
  return melhor
}
