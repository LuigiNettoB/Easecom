import { Card, CardContent } from '@/shared/ui/Card'
import { cn } from '@/shared/lib/cn'

type Tipo = 'Receita' | 'Taxa' | 'Despesa'

type Lancamento = {
  id: string
  descricao: string
  tipo: Tipo
  canal: string | null
  valor: number
}

const LANCAMENTOS: Lancamento[] = [
  {
    id: 'venda-8821',
    descricao: 'Venda #8821',
    tipo: 'Receita',
    canal: 'Mercado Livre',
    valor: 279.0,
  },
  {
    id: 'taxa-intermediacao',
    descricao: 'Taxa de intermediação',
    tipo: 'Taxa',
    canal: 'Mercado Livre',
    valor: 33.48,
  },
  {
    id: 'frete-correios',
    descricao: 'Frete — Correios',
    tipo: 'Despesa',
    canal: 'Shopee',
    valor: 18.9,
  },
  {
    id: 'compra-estoque-tech-import',
    descricao: 'Compra de estoque — Tech Import',
    tipo: 'Despesa',
    canal: null,
    valor: 2400.0,
  },
]

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const ESTILOS_TIPO: Record<Tipo, string> = {
  Receita: 'bg-[#85FA51]/25 text-[#1f5c0a]',
  Taxa: 'bg-amber-100 text-amber-800',
  Despesa: 'bg-red-100 text-red-800',
}

export function Financeiro() {
  const receitas = LANCAMENTOS.filter((item) => item.tipo === 'Receita').reduce(
    (soma, item) => soma + item.valor,
    0,
  )
  const despesas = LANCAMENTOS.filter((item) => item.tipo === 'Despesa').reduce(
    (soma, item) => soma + item.valor,
    0,
  )
  const taxas = LANCAMENTOS.filter((item) => item.tipo === 'Taxa').reduce(
    (soma, item) => soma + item.valor,
    0,
  )
  const margemLiquida = receitas > 0 ? ((receitas - despesas - taxas) / receitas) * 100 : 0

  const indicadores = [
    { rotulo: 'Receitas', valor: moeda.format(receitas), corBorda: 'border-l-[#85FA51]' },
    { rotulo: 'Despesas', valor: moeda.format(despesas), corBorda: 'border-l-[#7f1d1d]' },
    {
      rotulo: 'Taxas marketplaces',
      valor: moeda.format(taxas),
      corBorda: 'border-l-[#92400e]',
    },
  ]

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#00305c]">Financeiro</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {indicadores.map((indicador) => (
          <Card className={cn('border-l-4', indicador.corBorda)} key={indicador.rotulo}>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{indicador.rotulo}</p>
              <p className="mt-1 text-2xl font-semibold text-[#00305c]">{indicador.valor}</p>
            </CardContent>
          </Card>
        ))}

        <Card className="border-0 bg-[#005DAA]">
          <CardContent className="p-5">
            <p className="text-sm text-[#B5D4F4]">Margem líquida</p>
            <p className="mt-1 text-2xl font-semibold text-white">
              {margemLiquida.toFixed(1).replace('.', ',')}%
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-background shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-border bg-[#005DAA]/5 text-xs font-semibold uppercase tracking-wide text-[#005DAA]">
              <tr>
                <th className="px-5 py-3">Descrição</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Canal</th>
                <th className="px-5 py-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {LANCAMENTOS.map((lancamento) => {
                const positivo = lancamento.tipo === 'Receita'
                return (
                  <tr className="transition-colors hover:bg-[#85FA51]/10" key={lancamento.id}>
                    <td className="px-5 py-3 font-medium text-foreground">
                      {lancamento.descricao}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-1 text-xs font-medium',
                          ESTILOS_TIPO[lancamento.tipo],
                        )}
                      >
                        {lancamento.tipo}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {lancamento.canal ?? '—'}
                    </td>
                    <td
                      className={cn(
                        'px-5 py-3 text-right font-medium',
                        positivo ? 'text-[#1f5c0a]' : 'text-red-700',
                      )}
                    >
                      {positivo ? '+ ' : '− '}
                      {moeda.format(lancamento.valor)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {LANCAMENTOS.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            Nenhum lançamento encontrado.
          </p>
        )}
      </div>
    </section>
  )
}