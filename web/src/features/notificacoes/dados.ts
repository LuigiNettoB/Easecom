import { useMemo, useSyncExternalStore } from 'react'
import { useQuery } from '@tanstack/react-query'

import type { Produto } from '@/features/catalogo/produtos'
import { useVendas, type Venda } from '@/features/financeiro/vendas'
import { FORNECEDORES } from '@/features/fornecedores/dados'
import { resumoDoMes } from '@/features/inicio/dados'
import { api } from '@/shared/api/client'

export const CATEGORIAS = {
  vendas: 'Vendas',
  estoque: 'Estoque',
  anuncios: 'Anúncios',
  fornecedores: 'Fornecedores',
  sistema: 'Sistema',
} as const
export type Categoria = keyof typeof CATEGORIAS

export type Gravidade = 'critica' | 'atencao' | 'sucesso' | 'info'

export type Notificacao = {
  // estável entre carregamentos: é o que se guarda como "lida"
  id: string
  categoria: Categoria
  gravidade: Gravidade
  titulo: string
  descricao: string
  data: Date
  acao?: { rotulo: string; rota: string }
  real?: boolean
}

const DIA_MS = 86_400_000
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const dia = (data: Date) => data.toISOString().slice(0, 10)
const diaDaSemana = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: '2-digit',
})
const numero = (id: string) => id.replace('DEMO-', '')

// --- Estado local (lidas + preferências), compartilhado entre sino e página ---------------

const CHAVE_LIDAS = 'easecom.notificacoes-lidas'
const CHAVE_SILENCIADAS = 'easecom.notificacoes-silenciadas'

function ler(chave: string): string[] {
  try {
    const valor = JSON.parse(localStorage.getItem(chave) ?? '[]')
    return Array.isArray(valor) ? valor : []
  } catch {
    return []
  }
}

function gravar(chave: string, valor: string[]) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor))
  } catch {
    // sem armazenamento: o estado vale até recarregar
  }
}

let estado = { lidas: new Set(ler(CHAVE_LIDAS)), silenciadas: new Set(ler(CHAVE_SILENCIADAS)) }
const ouvintes = new Set<() => void>()

function atualizar(proximo: Partial<typeof estado>) {
  estado = { ...estado, ...proximo }
  // guarda só as lidas recentes para o armazenamento não crescer para sempre
  gravar(CHAVE_LIDAS, [...estado.lidas].slice(-500))
  gravar(CHAVE_SILENCIADAS, [...estado.silenciadas])
  ouvintes.forEach((ouvinte) => ouvinte())
}

function useEstado() {
  return useSyncExternalStore(
    (ouvinte) => {
      ouvintes.add(ouvinte)
      return () => ouvintes.delete(ouvinte)
    },
    () => estado,
  )
}

// --- Geração ------------------------------------------------------------------------------------

function deVendas(vendas: Venda[], hoje: Date): Notificacao[] {
  const lista: Notificacao[] = []
  const semana = new Date(hoje.getTime() - 7 * DIA_MS)

  for (const venda of vendas) {
    const produto = venda.itens[0]?.titulo ?? 'produto'
    if (venda.real) {
      lista.push({
        id: `venda-real-${venda.id}`,
        categoria: 'vendas',
        gravidade: 'sucesso',
        titulo: `Venda real no Mercado Livre — ${moeda.format(venda.total)}`,
        descricao: `Pedido #${venda.id}: ${produto}`,
        data: venda.data,
        acao: { rotulo: 'Ver pedido', rota: `/pedidos?q=${venda.id}&periodo=tudo` },
        real: true,
      })
      continue
    }
    if (venda.data < semana) continue
    if (venda.status === 'cancelado') {
      lista.push({
        id: `cancelamento-${venda.id}`,
        categoria: 'vendas',
        gravidade: 'atencao',
        titulo: `Pedido #${numero(venda.id)} cancelado`,
        descricao: `${venda.comprador} cancelou a compra de ${produto} (${moeda.format(venda.total)}) no ${venda.canal}.`,
        data: new Date(venda.data.getTime() + 2 * 3_600_000),
        acao: { rotulo: 'Ver pedido', rota: `/pedidos?q=${numero(venda.id)}&periodo=7d` },
      })
    } else if (venda.status === 'devolvido') {
      lista.push({
        id: `devolucao-${venda.id}`,
        categoria: 'vendas',
        gravidade: 'atencao',
        titulo: `Devolução solicitada no pedido #${numero(venda.id)}`,
        descricao: `${produto} — ${moeda.format(venda.total)} pode ser estornado.`,
        data: new Date(venda.data.getTime() + 3 * DIA_MS),
        acao: { rotulo: 'Ver pedido', rota: `/pedidos?q=${numero(venda.id)}&periodo=tudo` },
      })
    } else if (venda.total >= 300) {
      lista.push({
        id: `venda-alta-${venda.id}`,
        categoria: 'vendas',
        gravidade: 'sucesso',
        titulo: `Venda de alto valor: ${moeda.format(venda.total)}`,
        descricao: `${venda.comprador} comprou ${produto} pelo ${venda.canal}.`,
        data: venda.data,
        acao: { rotulo: 'Ver pedido', rota: `/pedidos?q=${numero(venda.id)}&periodo=7d` },
      })
    }
  }

  // resumo diário dos últimos 7 dias
  for (let i = 1; i <= 7; i++) {
    const inicio = new Date(hoje)
    inicio.setHours(0, 0, 0, 0)
    inicio.setDate(inicio.getDate() - i)
    const fim = new Date(inicio.getTime() + DIA_MS)
    const doDia = vendas.filter((v) => v.data >= inicio && v.data < fim && v.status !== 'cancelado')
    if (!doDia.length) continue
    const total = doDia.reduce((s, v) => s + v.total, 0)
    lista.push({
      id: `resumo-${dia(inicio)}`,
      categoria: 'vendas',
      gravidade: 'info',
      titulo: `Resumo de ${diaDaSemana.format(inicio)}: ${doDia.length} vendas · ${moeda.format(total)}`,
      descricao: `Ticket médio de ${moeda.format(total / doDia.length)}. Veja os detalhes no Financeiro.`,
      data: new Date(fim.getTime() + 7 * 3_600_000),
      acao: { rotulo: 'Abrir financeiro', rota: '/financeiro' },
    })
  }

  const atrasados = vendas.filter(
    (v) => v.status === 'pago' && hoje.getTime() - v.data.getTime() > DIA_MS,
  )
  if (atrasados.length) {
    lista.push({
      id: `atrasados-${dia(hoje)}`,
      categoria: 'vendas',
      gravidade: 'critica',
      titulo: `${atrasados.length} pedidos aguardando envio há mais de 24 h`,
      descricao:
        'Atrasos no despacho derrubam sua reputação nos marketplaces. Priorize esses envios.',
      data: new Date(new Date(hoje).setHours(8, 0, 0, 0)),
      acao: { rotulo: 'Ver atrasados', rota: '/pedidos?atrasados=1&periodo=tudo' },
    })
  }
  return lista
}

function deEstoque(produtos: Produto[], vendas: Venda[], hoje: Date): Notificacao[] {
  const inicio = new Date(hoje.getTime() - 30 * DIA_MS)
  const vendidas = new Map<string, number>()
  for (const venda of vendas) {
    if (venda.status === 'cancelado' || venda.data < inicio) continue
    for (const item of venda.itens)
      vendidas.set(item.produtoId, (vendidas.get(item.produtoId) ?? 0) + item.quantidade)
  }
  const fornecedorDe = (produtoId: string) =>
    FORNECEDORES.find((f) => f.catalogo.some((i) => i.produtoId === produtoId))

  return produtos.flatMap((produto): Notificacao[] => {
    if (produto.status !== 'active') return []
    const porDia = (vendidas.get(produto.id) ?? 0) / 30
    const dias = porDia > 0 ? produto.estoque / porDia : null
    const fornecedor = fornecedorDe(produto.id)
    const acao = fornecedor
      ? { rotulo: `Repor com ${fornecedor.nome}`, rota: `/fornecedores/${fornecedor.id}` }
      : { rotulo: 'Ver produto', rota: `/catalogo/${encodeURIComponent(produto.id)}` }
    if (produto.estoque === 0) {
      return [
        {
          id: `esgotado-${produto.id}-${dia(hoje)}`,
          categoria: 'estoque',
          gravidade: 'critica',
          titulo: `Esgotado: ${produto.nome}`,
          descricao: 'O anúncio está sem estoque e deixou de vender.',
          data: new Date(new Date(hoje).setHours(7, 30, 0, 0)),
          acao,
        },
      ]
    }
    if (dias !== null && dias < 7) {
      return [
        {
          id: `estoque-${produto.id}-${dia(hoje)}`,
          categoria: 'estoque',
          gravidade: dias < 3 ? 'critica' : 'atencao',
          titulo: `Estoque acabando: ${produto.nome}`,
          descricao: `Restam ${produto.estoque} un. — dura cerca de ${Math.max(Math.floor(dias), 0)} dias no ritmo atual (${porDia.toFixed(1).replace('.', ',')} vendas/dia).`,
          data: new Date(new Date(hoje).setHours(7, 0, 0, 0)),
          acao,
        },
      ]
    }
    return []
  })
}

function deAnuncios(produtos: Produto[], hoje: Date): Notificacao[] {
  return produtos
    .filter((p) => p.status === 'under_review')
    .map((produto, i) => ({
      id: `revisao-${produto.id}`,
      categoria: 'anuncios' as const,
      gravidade: 'atencao' as const,
      titulo: 'Anúncio em revisão no Mercado Livre',
      descricao: `${produto.nome} não aparece para compradores até ser aprovado.`,
      data: new Date(hoje.getTime() - (2 + i) * 3_600_000),
      acao: { rotulo: 'Ver anúncio', rota: `/catalogo/${encodeURIComponent(produto.id)}` },
      real: true,
    }))
}

function deFornecedores(hoje: Date): Notificacao[] {
  return FORNECEDORES.flatMap((fornecedor) =>
    fornecedor.compras
      .filter((c) => c.status !== 'entregue')
      .map((compra): Notificacao => {
        const atrasada = compra.status === 'atrasada'
        return {
          id: `compra-${compra.id}-${compra.status}`,
          categoria: 'fornecedores',
          gravidade: atrasada ? 'critica' : 'info',
          titulo: atrasada
            ? `Compra ${compra.id} da ${fornecedor.nome} está atrasada`
            : `Compra ${compra.id} da ${fornecedor.nome} a caminho`,
          descricao: atrasada
            ? `Prazo de ${fornecedor.condicoes.prazoEntregaDias} dias estourado. Fale com ${fornecedor.contato.nome.split(' ')[0]}.`
            : `${compra.itens} unidades · ${moeda.format(compra.valor)} — previsão em até ${fornecedor.condicoes.prazoEntregaDias} dias.`,
          data: atrasada
            ? new Date(new Date(hoje).setHours(9, 0, 0, 0))
            : new Date(`${compra.data}T15:00`),
          acao: { rotulo: 'Ver fornecedor', rota: `/fornecedores/${fornecedor.id}` },
        }
      }),
  )
}

function lerMeta() {
  try {
    const valor = Number(localStorage.getItem('easecom.meta-mensal'))
    return valor > 0 ? valor : null
  } catch {
    return null
  }
}

function deSistema(vendas: Venda[], hoje: Date, conectado: boolean | undefined): Notificacao[] {
  const lista: Notificacao[] = []
  if (conectado === false) {
    lista.push({
      id: `ml-desconectado-${dia(hoje)}`,
      categoria: 'sistema',
      gravidade: 'critica',
      titulo: 'Mercado Livre desconectado',
      descricao: 'Reconecte a conta para voltar a sincronizar anúncios e pedidos.',
      data: hoje,
      acao: { rotulo: 'Conectar', rota: '/canais' },
      real: true,
    })
  } else if (conectado) {
    lista.push({
      id: `ml-sincronizado-${dia(hoje)}`,
      categoria: 'sistema',
      gravidade: 'sucesso',
      titulo: 'Mercado Livre sincronizado',
      descricao: 'Anúncios e pedidos foram atualizados a partir da sua conta.',
      data: new Date(new Date(hoje).setHours(6, 0, 0, 0)),
      acao: { rotulo: 'Ver canais', rota: '/canais' },
      real: true,
    })
  }

  const mes = resumoDoMes(vendas, hoje)
  const meta = lerMeta() ?? mes.metaSugerida
  const noRitmo = mes.projecao >= meta
  lista.push({
    id: `meta-${dia(hoje)}`,
    categoria: 'sistema',
    gravidade: noRitmo ? 'sucesso' : 'atencao',
    titulo: noRitmo ? 'No ritmo para bater a meta do mês' : 'Abaixo do ritmo da meta do mês',
    descricao: `${moeda.format(mes.faturamento)} de ${moeda.format(meta)} — projeção de ${moeda.format(mes.projecao)} até o fim do mês.`,
    data: new Date(new Date(hoje).setHours(8, 30, 0, 0)),
    acao: { rotulo: 'Ver meta', rota: '/' },
  })
  return lista
}

export function useNotificacoes() {
  const { vendas, anuncios, hoje, carregando } = useVendas(true)
  const status = useQuery({
    queryKey: ['canais', 'mercado-livre', 'status'],
    queryFn: async () =>
      (await api.get<{ conectado: boolean }>('/canais/mercado-livre/status')).data,
  })
  const { lidas, silenciadas } = useEstado()

  const todas = useMemo(() => {
    if (carregando) return []
    const produtos = anuncios.data ?? []
    return [
      ...deVendas(vendas, hoje),
      ...deEstoque(produtos, vendas, hoje),
      ...deAnuncios(produtos, hoje),
      ...deFornecedores(hoje),
      ...deSistema(vendas, hoje, status.data?.conectado),
    ]
      .filter((n) => n.data <= hoje)
      .sort((a, b) => b.data.getTime() - a.data.getTime())
  }, [anuncios.data, carregando, hoje, status.data?.conectado, vendas])

  const visiveis = todas.filter((n) => !silenciadas.has(n.categoria))
  return {
    carregando,
    hoje,
    todas,
    visiveis,
    naoLidas: visiveis.filter((n) => !lidas.has(n.id)).length,
    estaLida: (id: string) => lidas.has(id),
    silenciada: (categoria: Categoria) => silenciadas.has(categoria),
    marcarLida: (id: string, lida = true) => {
      const proximas = new Set(lidas)
      if (lida) proximas.add(id)
      else proximas.delete(id)
      atualizar({ lidas: proximas })
    },
    marcarTodasLidas: (ids: string[]) => atualizar({ lidas: new Set([...lidas, ...ids]) }),
    alternarCategoria: (categoria: Categoria) => {
      const proximas = new Set(silenciadas)
      if (proximas.has(categoria)) proximas.delete(categoria)
      else proximas.add(categoria)
      atualizar({ silenciadas: proximas })
    },
  }
}
