import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'

import { api } from '@/shared/api/client'
import { Button } from '@/shared/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/Card'
import type { ErroApi } from '@/shared/api/types'

// Tela de teste: mostra os pedidos exatamente como estão gravados no banco do
// hub (tabelas `pedidos_pedido` e `pedidos_itempedido`), sem falar com o
// marketplace. Só o botão "Sincronizar agora" busca dados novos nos canais.

interface ItemPedido {
  id: string
  id_externo: string
  titulo: string
  sku: string
  quantidade: number
  preco_unitario: number
  taxa_venda: number
}

interface Pedido {
  id: string
  canal: string
  canal_nome: string
  id_externo: string
  status: string
  status_no_canal: string
  entregue: boolean
  realizado_em: string
  valor_total: number
  valor_pago: number
  moeda: string
  comprador_apelido: string
  itens: ItemPedido[]
  sincronizado_em: string
}

interface ListaPaginada<T> {
  count: number
  results: T[]
}

interface ResumoVendas {
  total_pedidos: number
  receita_total: number
  pedidos_por_status: Record<string, number>
  por_canal: { canal: string; canal_nome: string; total_pedidos: number; receita_total: number }[]
  produtos_mais_vendidos: { id_externo: string; titulo: string; sku: string; quantidade: number }[]
  ultima_sincronizacao: string | null
}

interface ResultadoSincronizacao {
  canais: { canal: string; criados: number; atualizados: number }[]
}

const formatarMoeda = (valor: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)

const formatarData = (data: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(data),
  )

const mensagemDeErro = (erro: unknown) =>
  axios.isAxiosError<ErroApi>(erro)
    ? (erro.response?.data.mensagem ?? 'Não foi possível falar com o servidor.')
    : 'Não foi possível falar com o servidor.'

export function PedidosTestePage() {
  const queryClient = useQueryClient()

  const resumo = useQuery({
    queryKey: ['vendas', 'resumo'],
    queryFn: async () => (await api.get<ResumoVendas>('/vendas/resumo')).data,
  })

  const pedidos = useQuery({
    queryKey: ['pedidos', 'teste'],
    queryFn: async () =>
      (await api.get<ListaPaginada<Pedido>>('/pedidos', { params: { tamanho_pagina: 100 } })).data,
  })

  const sincronizacao = useMutation({
    mutationFn: async () => (await api.post<ResultadoSincronizacao>('/pedidos/sincronizar')).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vendas', 'resumo'] })
      void queryClient.invalidateQueries({ queryKey: ['pedidos', 'teste'] })
    },
  })

  const erroDeLeitura = resumo.error ?? pedidos.error

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Pedidos — tela de teste</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Dados lidos do banco do hub. Última sincronização:{' '}
            {resumo.data?.ultima_sincronizacao
              ? formatarData(resumo.data.ultima_sincronizacao)
              : 'nunca'}
          </p>
        </div>
        <Button disabled={sincronizacao.isPending} onClick={() => sincronizacao.mutate()}>
          {sincronizacao.isPending ? 'Sincronizando...' : 'Sincronizar agora'}
        </Button>
      </div>

      {sincronizacao.isSuccess && (
        <p className="text-sm text-primary">
          {sincronizacao.data.canais
            .map((c) => `${c.canal}: ${c.criados} novos, ${c.atualizados} atualizados`)
            .join(' · ')}
        </p>
      )}
      {sincronizacao.isError && (
        <p className="text-sm text-destructive">{mensagemDeErro(sincronizacao.error)}</p>
      )}
      {erroDeLeitura && <p className="text-sm text-destructive">{mensagemDeErro(erroDeLeitura)}</p>}

      {resumo.data && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Pedidos no banco</p>
              <p className="text-2xl font-semibold">{resumo.data.total_pedidos}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Receita (pedidos pagos)</p>
              <p className="text-2xl font-semibold">{formatarMoeda(resumo.data.receita_total)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Por status</p>
              <p className="text-sm">
                {Object.entries(resumo.data.pedidos_por_status)
                  .map(([status, total]) => `${status}: ${total}`)
                  .join(' · ') || '—'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Por canal</p>
              <p className="text-sm">
                {resumo.data.por_canal
                  .map((c) => `${c.canal_nome}: ${c.total_pedidos}`)
                  .join(' · ') || '—'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {resumo.data && resumo.data.produtos_mais_vendidos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Produtos mais vendidos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {resumo.data.produtos_mais_vendidos.map((produto) => (
              <div
                key={produto.id_externo}
                className="flex items-center justify-between gap-4 text-sm"
              >
                <span>
                  {produto.titulo}
                  {produto.sku && <span className="text-muted-foreground"> · {produto.sku}</span>}
                </span>
                <span className="shrink-0 font-medium">{produto.quantidade} vendidos</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Pedidos gravados</CardTitle>
          <CardDescription>
            Cada linha é um registro da tabela <code>pedidos_pedido</code>; os itens vêm de{' '}
            <code>pedidos_itempedido</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {pedidos.isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
          {pedidos.data?.count === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum pedido no banco ainda. Clique em &quot;Sincronizar agora&quot;.
            </p>
          )}
          {pedidos.data && pedidos.data.count > 0 && (
            <table className="w-full text-left text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 pr-4 font-medium">Canal</th>
                  <th className="py-2 pr-4 font-medium">Nº no canal</th>
                  <th className="py-2 pr-4 font-medium">Data</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Comprador</th>
                  <th className="py-2 pr-4 font-medium">Itens</th>
                  <th className="py-2 pr-4 text-right font-medium">Total</th>
                  <th className="py-2 text-right font-medium">Pago</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.data.results.map((pedido) => (
                  <tr key={pedido.id} className="border-b border-border align-top last:border-b-0">
                    <td className="py-2 pr-4">{pedido.canal_nome}</td>
                    <td className="py-2 pr-4">{pedido.id_externo}</td>
                    <td className="whitespace-nowrap py-2 pr-4">
                      {formatarData(pedido.realizado_em)}
                    </td>
                    <td className="py-2 pr-4">
                      {pedido.status}
                      <span className="block text-xs text-muted-foreground">
                        no canal: {pedido.status_no_canal}
                        {pedido.entregue ? ' · entregue' : ''}
                      </span>
                    </td>
                    <td className="py-2 pr-4">{pedido.comprador_apelido}</td>
                    <td className="py-2 pr-4">
                      {pedido.itens.map((item) => (
                        <span key={item.id} className="block">
                          {item.quantidade}x {item.titulo}
                          <span className="text-muted-foreground">
                            {' '}
                            ({formatarMoeda(item.preco_unitario)})
                          </span>
                        </span>
                      ))}
                    </td>
                    <td className="py-2 pr-4 text-right">{formatarMoeda(pedido.valor_total)}</td>
                    <td className="py-2 text-right">{formatarMoeda(pedido.valor_pago)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
