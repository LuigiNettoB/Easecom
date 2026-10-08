import { Link, useLocation, useNavigate } from 'react-router-dom'

import { cn } from '@/shared/lib/cn'

import {
  LIMITE_ESTOQUE_BAIXO,
  ROTULOS_STATUS,
  moeda,
  statusDoProduto,
  type Produto,
} from './produtos'

function SeloProduto({ produto }: { produto: Produto }) {
  const status = statusDoProduto(produto)
  if (status !== 'active') {
    return (
      <span className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
        {ROTULOS_STATUS[status] ?? status}
      </span>
    )
  }
  if (produto.estoque <= LIMITE_ESTOQUE_BAIXO) {
    return (
      <span className="rounded border border-red-300 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-800">
        Estoque baixo
      </span>
    )
  }
  if (produto.vendidos > 0) {
    return (
      <span className="rounded border border-[#85FA51] bg-[#f1fee9] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#1f5c0a]">
        {produto.vendidos} {produto.vendidos === 1 ? 'vendido' : 'vendidos'}
      </span>
    )
  }
  return null
}

function IndicadorEstoque({ estoque }: { estoque: number }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={cn(
          'h-2 w-2 rounded-full',
          estoque <= LIMITE_ESTOQUE_BAIXO ? 'bg-red-500' : 'bg-[#85FA51]',
        )}
      />
      {estoque} un.
    </span>
  )
}

// leva os filtros atuais junto, para o "voltar" da página do produto restaurá-los
function useEstadoNavegacao() {
  return { busca: useLocation().search }
}

export function GradeProdutos({ produtos }: { produtos: Produto[] }) {
  const estado = useEstadoNavegacao()

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {produtos.map((produto) => (
        <li key={produto.id}>
          <Link
            className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-background shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA]"
            state={estado}
            to={`/catalogo/${encodeURIComponent(produto.id)}`}
          >
            <div className="relative aspect-square overflow-hidden bg-muted/40">
              <img
                alt=""
                className="h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
                src={produto.foto}
              />
              <div className="absolute left-2 top-2">
                <SeloProduto produto={produto} />
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-1 border-t border-border p-4">
              <p className="text-xs font-semibold text-[#00305c]">{produto.categoria}</p>
              <p className="line-clamp-2 text-sm text-foreground">{produto.nome}</p>
              <div className="mt-auto flex items-center gap-3 pt-3 text-xs text-muted-foreground">
                <IndicadorEstoque estoque={produto.estoque} />
                <span className="h-3 w-px bg-border" />
                <span>
                  por{' '}
                  <span className="text-sm font-semibold text-[#005DAA]">
                    {moeda.format(produto.preco)}
                  </span>
                </span>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function ListaProdutos({ produtos }: { produtos: Produto[] }) {
  const navigate = useNavigate()
  const estado = useEstadoNavegacao()

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead className="border-b border-border bg-[#005DAA]/5 text-xs font-semibold uppercase tracking-wide text-[#005DAA]">
            <tr>
              <th className="w-20 px-5 py-3">Foto</th>
              <th className="px-5 py-3">Produto</th>
              <th className="px-5 py-3">SKU</th>
              <th className="px-5 py-3">Categoria</th>
              <th className="px-5 py-3">Preço</th>
              <th className="px-5 py-3">Estoque</th>
              <th className="px-5 py-3">Vendidos</th>
              <th className="px-5 py-3">Canais</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {produtos.map((produto) => {
              const rota = `/catalogo/${encodeURIComponent(produto.id)}`
              return (
                <tr
                  className="cursor-pointer transition-colors hover:bg-[#85FA51]/10"
                  key={produto.id}
                  onClick={() => navigate(rota, { state: estado })}
                >
                  <td className="px-5 py-3">
                    <img
                      alt=""
                      className="h-11 w-11 rounded-md border border-border bg-white object-contain"
                      src={produto.foto}
                    />
                  </td>
                  <td className="min-w-[260px] px-5 py-3">
                    <Link
                      className="line-clamp-2 font-medium text-foreground hover:text-[#005DAA] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA]"
                      onClick={(event) => event.stopPropagation()}
                      state={estado}
                      to={rota}
                    >
                      {produto.nome}
                    </Link>
                    <div className="mt-1">
                      <SeloProduto produto={produto} />
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-muted-foreground">
                    {produto.sku || '—'}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{produto.categoria}</td>
                  <td className="whitespace-nowrap px-5 py-3 font-medium text-[#00305c]">
                    {moeda.format(produto.preco)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-foreground">
                    <IndicadorEstoque estoque={produto.estoque} />
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{produto.vendidos}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {produto.canais.map((canal) => (
                        <span
                          className="whitespace-nowrap rounded-full bg-[#005DAA]/10 px-2.5 py-1 text-xs font-medium text-[#005DAA]"
                          key={canal}
                        >
                          {canal}
                        </span>
                      ))}
                      {produto.canais.length === 0 && (
                        <span className="text-xs text-muted-foreground">Nenhum canal</span>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
