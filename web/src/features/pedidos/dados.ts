import { useSearchParams } from 'react-router-dom'

import { ROTULOS_STATUS_VENDA, type StatusVenda, type Venda } from '@/features/financeiro/vendas'

const DIA_MS = 86_400_000

export const PERIODOS_PEDIDOS = {
  hoje: 'Hoje',
  '7d': '7 dias',
  '30d': '30 dias',
  '90d': '90 dias',
  tudo: 'Tudo',
} as const
export type PeriodoPedidos = keyof typeof PERIODOS_PEDIDOS

export const ORDENACOES_PEDIDOS = {
  recentes: 'Mais recentes',
  antigos: 'Mais antigos',
  maior_valor: 'Maior valor',
  menor_valor: 'Menor valor',
} as const
export type OrdenacaoPedidos = keyof typeof ORDENACOES_PEDIDOS

export const ORDEM_STATUS: StatusVenda[] = ['pago', 'enviado', 'entregue', 'devolvido', 'cancelado']

export type FiltrosPedidos = {
  periodo: PeriodoPedidos
  busca: string
  status: StatusVenda | null
  canais: string[]
  pagamento: string
  ordem: OrdenacaoPedidos
  somenteAtrasados: boolean
}

// Filtros na URL: dá para compartilhar o link de uma visão (ex.: "pedidos
// atrasados do Mercado Livre") e o voltar do navegador funciona.
export function useFiltrosPedidos() {
  const [params, setParams] = useSearchParams()
  const periodo = params.get('periodo')
  const status = params.get('status')
  const ordem = params.get('ordem')

  const filtros: FiltrosPedidos = {
    periodo: periodo && periodo in PERIODOS_PEDIDOS ? (periodo as PeriodoPedidos) : '30d',
    busca: params.get('q') ?? '',
    status: status && ORDEM_STATUS.includes(status as StatusVenda) ? (status as StatusVenda) : null,
    canais: params.getAll('canal'),
    pagamento: params.get('pagamento') ?? '',
    ordem: ordem && ordem in ORDENACOES_PEDIDOS ? (ordem as OrdenacaoPedidos) : 'recentes',
    somenteAtrasados: params.get('atrasados') === '1',
  }

  function atualizar(alterar: (p: URLSearchParams) => void) {
    setParams(
      (atuais) => {
        const proximos = new URLSearchParams(atuais)
        alterar(proximos)
        proximos.delete('pagina')
        return proximos
      },
      { replace: true },
    )
  }
  const definir = (chave: string, valor: string) =>
    atualizar((p) => (valor ? p.set(chave, valor) : p.delete(chave)))

  return {
    filtros,
    pagina: Math.max(Number(params.get('pagina')) || 1, 1),
    definirPagina: (pagina: number) =>
      setParams(
        (atuais) => {
          const proximos = new URLSearchParams(atuais)
          if (pagina > 1) proximos.set('pagina', String(pagina))
          else proximos.delete('pagina')
          return proximos
        },
        { replace: true },
      ),
    definirPeriodo: (valor: PeriodoPedidos) => definir('periodo', valor === '30d' ? '' : valor),
    definirBusca: (valor: string) => definir('q', valor),
    definirStatus: (valor: StatusVenda | null) => definir('status', valor ?? ''),
    definirPagamento: (valor: string) => definir('pagamento', valor),
    definirOrdem: (valor: OrdenacaoPedidos) => definir('ordem', valor === 'recentes' ? '' : valor),
    alternarAtrasados: () => definir('atrasados', filtros.somenteAtrasados ? '' : '1'),
    alternarCanal: (canal: string) =>
      atualizar((p) => {
        const atuais = p.getAll('canal')
        p.delete('canal')
        const proximos = atuais.includes(canal)
          ? atuais.filter((c) => c !== canal)
          : [...atuais, canal]
        proximos.forEach((c) => p.append('canal', c))
      }),
    limparFiltros: () =>
      atualizar((p) => {
        for (const chave of ['q', 'status', 'canal', 'pagamento', 'atrasados']) p.delete(chave)
      }),
  }
}

export function inicioDoPeriodo(periodo: PeriodoPedidos, hoje: Date) {
  const inicioHoje = new Date(hoje)
  inicioHoje.setHours(0, 0, 0, 0)
  const dias = { hoje: 0, '7d': 6, '30d': 29, '90d': 89, tudo: null }[periodo]
  return dias === null ? null : new Date(inicioHoje.getTime() - dias * DIA_MS)
}

// pago há mais de 24 h e ainda não despachado
export function estaAtrasado(venda: Venda, hoje: Date) {
  return venda.status === 'pago' && hoje.getTime() - venda.data.getTime() > DIA_MS
}

const normalizar = (texto: string) =>
  texto.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[̀-ͯ]/g, '')

// tudo menos status: o funil de status mostra a contagem de cada etapa
// dentro dos demais filtros, e serve ele mesmo de filtro de status
export function filtrarSemStatus(vendas: Venda[], filtros: FiltrosPedidos, hoje: Date) {
  const inicio = inicioDoPeriodo(filtros.periodo, hoje)
  const termo = normalizar(filtros.busca.trim())
  return vendas.filter(
    (venda) =>
      (!inicio || venda.data >= inicio) &&
      (filtros.canais.length === 0 || filtros.canais.includes(venda.canal)) &&
      (!filtros.pagamento || venda.formaPagamento === filtros.pagamento) &&
      (!filtros.somenteAtrasados || estaAtrasado(venda, hoje)) &&
      (!termo ||
        normalizar(
          [venda.id, venda.comprador, ...venda.itens.map((item) => item.titulo)].join(' '),
        ).includes(termo)),
  )
}

export function aplicarStatusEOrdem(vendas: Venda[], filtros: FiltrosPedidos) {
  const filtradas = filtros.status ? vendas.filter((v) => v.status === filtros.status) : vendas
  const comparar = {
    recentes: (a: Venda, b: Venda) => b.data.getTime() - a.data.getTime(),
    antigos: (a: Venda, b: Venda) => a.data.getTime() - b.data.getTime(),
    maior_valor: (a: Venda, b: Venda) => b.total - a.total,
    menor_valor: (a: Venda, b: Venda) => a.total - b.total,
  }[filtros.ordem]
  return [...filtradas].sort(comparar)
}

export function valoresDaVenda(venda: Venda) {
  const tarifas = venda.itens.reduce((soma, item) => soma + item.tarifa, 0)
  const subtotal = venda.itens.reduce(
    (soma, item) => soma + item.precoUnitario * item.quantidade,
    0,
  )
  return { subtotal, tarifas, frete: venda.frete, liquido: venda.total - tarifas - venda.frete }
}

// --- Série para o gráfico de volume -----------------------------------------------------------

const diaMes = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' })
const dataLonga = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
})
const mesAno = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' })
const mesAnoLongo = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })

export function seriePedidos(vendas: Venda[], periodo: PeriodoPedidos, hoje: Date) {
  const contaPedido = (v: Venda) => v.status !== 'cancelado'
  if (periodo === 'hoje') {
    const pontos = Array.from({ length: hoje.getHours() + 1 }, (_, hora) => ({
      rotulo: `${hora}h`,
      rotuloCompleto: `Das ${hora}h às ${hora}h59`,
      valor: 0,
    }))
    for (const venda of vendas.filter(contaPedido)) {
      const ponto = pontos[venda.data.getHours()]
      if (ponto) ponto.valor += 1
    }
    return { pontos, unidade: 'por hora' }
  }
  if (periodo === 'tudo') {
    const primeiro = vendas.reduce((menor, v) => (v.data < menor ? v.data : menor), hoje)
    const pontos: { chave: string; rotulo: string; rotuloCompleto: string; valor: number }[] = []
    for (
      let mes = new Date(primeiro.getFullYear(), primeiro.getMonth(), 1);
      mes <= hoje;
      mes = new Date(mes.getFullYear(), mes.getMonth() + 1, 1)
    ) {
      pontos.push({
        chave: `${mes.getFullYear()}-${mes.getMonth()}`,
        rotulo: mesAno.format(mes).replace('. de ', '/').replace('.', ''),
        rotuloCompleto: mesAnoLongo.format(mes),
        valor: 0,
      })
    }
    const indice = new Map(pontos.map((p) => [p.chave, p]))
    for (const venda of vendas.filter(contaPedido)) {
      const ponto = indice.get(`${venda.data.getFullYear()}-${venda.data.getMonth()}`)
      if (ponto) ponto.valor += 1
    }
    return { pontos, unidade: 'por mês' }
  }
  const inicio = inicioDoPeriodo(periodo, hoje)!
  const dias = Math.round((hoje.getTime() - inicio.getTime()) / DIA_MS) + 1
  const pontos = Array.from({ length: dias }, (_, i) => {
    const dia = new Date(inicio.getTime() + i * DIA_MS)
    return { rotulo: diaMes.format(dia), rotuloCompleto: dataLonga.format(dia), valor: 0 }
  })
  for (const venda of vendas.filter(contaPedido)) {
    const indice = Math.floor((venda.data.getTime() - inicio.getTime()) / DIA_MS)
    if (pontos[indice]) pontos[indice].valor += 1
  }
  return { pontos, unidade: 'por dia' }
}

// --- Linha do tempo de um pedido ------------------------------------------------------------------

export type EtapaPedido = {
  rotulo: string
  data: Date | null
  concluida: boolean
  prevista?: boolean
}

// hash estável do id: a mesma venda sempre tem os mesmos prazos simulados
function semente(id: string) {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0
  return Math.abs(h)
}

export function linhaDoTempo(venda: Venda, hoje: Date): EtapaPedido[] {
  const s = semente(venda.id)
  const pago = new Date(venda.data.getTime() + (2 + (s % 9)) * 60_000)
  const envio = new Date(venda.data.getTime() + (18 + (s % 30)) * 3_600_000)
  const entrega = new Date(envio.getTime() + (2 + (s % 4)) * DIA_MS)

  const etapas: EtapaPedido[] = [
    { rotulo: 'Pedido realizado', data: venda.data, concluida: true },
    { rotulo: 'Pagamento aprovado', data: pago, concluida: venda.status !== 'cancelado' },
  ]
  if (venda.status === 'cancelado') {
    return [...etapas.slice(0, 1), { rotulo: 'Pedido cancelado', data: pago, concluida: true }]
  }
  const enviado = ['enviado', 'entregue', 'devolvido'].includes(venda.status)
  const entregue = ['entregue', 'devolvido'].includes(venda.status)
  etapas.push(
    { rotulo: 'Enviado', data: enviado ? envio : null, concluida: enviado },
    {
      rotulo: entregue ? 'Entregue' : 'Entrega prevista',
      data: entregue || enviado ? entrega : null,
      concluida: entregue,
      prevista: !entregue && enviado,
    },
  )
  if (venda.status === 'devolvido') {
    etapas.push({
      rotulo: 'Devolução solicitada',
      data: new Date(entrega.getTime() + (1 + (s % 5)) * DIA_MS),
      concluida: true,
    })
  }
  // datas simuladas não podem passar de "agora"
  return etapas.map((etapa) =>
    etapa.data && etapa.data > hoje && etapa.concluida ? { ...etapa, data: hoje } : etapa,
  )
}

// --- Exportação --------------------------------------------------------------------------------------

export function exportarCsv(vendas: Venda[]) {
  const cabecalho = [
    'Pedido',
    'Data',
    'Cliente',
    'Canal',
    'Pagamento',
    'Parcelas',
    'Itens',
    'Total',
    'Tarifas',
    'Frete',
    'Líquido',
    'Status',
    'Origem',
  ]
  const numero = (valor: number) => valor.toFixed(2).replace('.', ',')
  const celula = (valor: string) => `"${valor.replace(/"/g, '""')}"`
  const linhas = vendas.map((venda) => {
    const { tarifas, frete, liquido } = valoresDaVenda(venda)
    return [
      venda.id,
      venda.data.toLocaleString('pt-BR'),
      venda.comprador,
      venda.canal,
      venda.formaPagamento,
      String(venda.parcelas),
      venda.itens.map((item) => `${item.quantidade}x ${item.titulo}`).join(' | '),
      numero(venda.total),
      numero(tarifas),
      numero(frete),
      numero(liquido),
      ROTULOS_STATUS_VENDA[venda.status],
      venda.real ? 'Real' : 'Demonstração',
    ]
      .map(celula)
      .join(';')
  })
  // BOM + ";" para o Excel em português abrir com acentos e colunas certas
  const conteudo = '﻿' + [cabecalho.map(celula).join(';'), ...linhas].join('\r\n')
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `pedidos-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
