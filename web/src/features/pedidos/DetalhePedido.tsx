import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { CheckIcon, ClockIcon, XMarkIcon } from '@heroicons/react/24/outline'

import type { Produto } from '@/features/catalogo/produtos'
import {
  ESTILOS_STATUS_VENDA,
  ROTULOS_STATUS_VENDA,
  type Venda,
} from '@/features/financeiro/vendas'
import { cn } from '@/shared/lib/cn'

import { linhaDoTempo, valoresDaVenda } from './dados'
import { iniciais, moeda } from './formatos'

const dataHora = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})
const percentual = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 })

type DetalhePedidoProps = {
  venda: Venda
  hoje: Date
  produtos: Map<string, Produto>
  pedidosDoCliente: number
  onFechar: () => void
}

export function DetalhePedido({
  venda,
  hoje,
  produtos,
  pedidosDoCliente,
  onFechar,
}: DetalhePedidoProps) {
  const botaoFechar = useRef<HTMLButtonElement | null>(null)
  const { subtotal, tarifas, frete, liquido } = valoresDaVenda(venda)
  const etapas = linhaDoTempo(venda, hoje)

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    botaoFechar.current?.focus()
    const aoTeclar = (evento: KeyboardEvent) => evento.key === 'Escape' && onFechar()
    window.addEventListener('keydown', aoTeclar)
    return () => {
      window.removeEventListener('keydown', aoTeclar)
      anterior?.focus()
    }
  }, [onFechar])

  // portal no <body>: fora do fluxo da página, nenhum espaçamento herdado desloca a gaveta
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div aria-hidden="true" className="absolute inset-0 bg-black/40" onClick={onFechar} />
      <aside
        aria-labelledby="titulo-detalhe-pedido"
        aria-modal="true"
        className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-background shadow-2xl"
        role="dialog"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-background px-6 py-4">
          <div>
            <p className="text-xs text-muted-foreground">{dataHora.format(venda.data)}</p>
            <h2
              className="flex flex-wrap items-center gap-2 text-lg font-semibold text-[#00305c]"
              id="titulo-detalhe-pedido"
            >
              Pedido #{venda.id.replace('DEMO-', '')}
              {venda.real && (
                <span className="rounded bg-[#005DAA] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                  Real
                </span>
              )}
            </h2>
            <span
              className={cn(
                'mt-1.5 inline-block rounded-full px-2.5 py-1 text-xs font-medium',
                ESTILOS_STATUS_VENDA[venda.status].badge,
              )}
            >
              {ROTULOS_STATUS_VENDA[venda.status]}
            </span>
          </div>
          <button
            aria-label="Fechar detalhes do pedido"
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA]"
            onClick={onFechar}
            ref={botaoFechar}
            type="button"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </header>

        <div className="flex flex-col gap-6 px-6 py-5">
          <section className="flex items-center gap-3 rounded-lg border border-border p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#005DAA]/10 text-sm font-semibold text-[#005DAA]">
              {iniciais(venda.comprador)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#00305c]">{venda.comprador}</p>
              <p className="text-xs text-muted-foreground">
                {pedidosDoCliente > 1
                  ? `Cliente recorrente · ${pedidosDoCliente} pedidos`
                  : 'Primeira compra'}
              </p>
            </div>
            <div className="text-right text-xs">
              <p className="font-medium text-foreground">{venda.canal}</p>
              <p className="text-muted-foreground">
                {venda.formaPagamento}
                {venda.parcelas > 1 && ` · ${venda.parcelas}x`}
              </p>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-[#00305c]">Acompanhamento</h3>
            <ol className="flex flex-col">
              {etapas.map((etapa, i) => (
                <li className="relative flex gap-3 pb-4 last:pb-0" key={etapa.rotulo}>
                  {i < etapas.length - 1 && (
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute left-3 top-7 h-[calc(100%-1.75rem)] w-0.5',
                        etapas[i + 1].concluida ? 'bg-[#005DAA]' : 'bg-border',
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                      etapa.concluida
                        ? etapa.rotulo.includes('cancel') || etapa.rotulo.includes('Devolu')
                          ? 'bg-red-100 text-red-700'
                          : 'bg-[#005DAA] text-white'
                        : 'border-2 border-border bg-background text-muted-foreground',
                    )}
                  >
                    {etapa.concluida ? (
                      <CheckIcon className="h-3.5 w-3.5" />
                    ) : (
                      <ClockIcon className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <div className="text-sm">
                    <p
                      className={cn(
                        'font-medium',
                        etapa.concluida ? 'text-[#00305c]' : 'text-muted-foreground',
                      )}
                    >
                      {etapa.rotulo}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {etapa.data
                        ? `${etapa.prevista ? 'Previsão: ' : ''}${dataHora.format(etapa.data)}`
                        : 'Aguardando'}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-3 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              {venda.real
                ? 'Pedido real do Mercado Livre. O rastreio do envio ainda não faz parte da integração — etapas após o pagamento são estimadas.'
                : 'Pedido de demonstração: datas de envio e entrega simuladas.'}
            </p>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-[#00305c]">
              Itens · {venda.itens.reduce((soma, item) => soma + item.quantidade, 0)} un.
            </h3>
            <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
              {venda.itens.map((item) => {
                const produto = produtos.get(item.produtoId)
                return (
                  <li className="flex items-center gap-3 p-3" key={item.produtoId}>
                    {produto ? (
                      <img
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-md border border-border bg-white object-contain"
                        src={produto.foto}
                      />
                    ) : (
                      <span className="h-12 w-12 shrink-0 rounded-md bg-muted" />
                    )}
                    <div className="min-w-0 flex-1">
                      {produto ? (
                        <Link
                          className="line-clamp-2 text-sm text-foreground hover:text-[#005DAA] hover:underline"
                          to={`/catalogo/${encodeURIComponent(produto.id)}`}
                        >
                          {item.titulo}
                        </Link>
                      ) : (
                        <p className="line-clamp-2 text-sm">{item.titulo}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {item.quantidade} × {moeda.format(item.precoUnitario)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-medium tabular-nums text-[#00305c]">
                      {moeda.format(item.quantidade * item.precoUnitario)}
                    </p>
                  </li>
                )
              })}
            </ul>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-[#00305c]">Resumo financeiro</h3>
            <dl className="flex flex-col gap-2 rounded-lg border border-border p-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal dos itens</dt>
                <dd className="tabular-nums">{moeda.format(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Tarifa do marketplace</dt>
                <dd className="tabular-nums text-red-700">− {moeda.format(tarifas)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Frete pago por você</dt>
                <dd
                  className={cn(
                    'tabular-nums',
                    frete > 0 ? 'text-red-700' : 'text-muted-foreground',
                  )}
                >
                  {frete > 0 ? `− ${moeda.format(frete)}` : 'Sem custo'}
                </dd>
              </div>
              <div className="mt-1 flex items-baseline justify-between border-t border-border pt-3">
                <dt className="font-semibold text-[#00305c]">Você recebe</dt>
                <dd className="text-right">
                  <span className="text-lg font-semibold tabular-nums text-[#00305c]">
                    {moeda.format(liquido)}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {percentual.format(venda.total ? liquido / venda.total : 0)} do valor da venda
                  </span>
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </aside>
    </div>,
    document.body,
  )
}
