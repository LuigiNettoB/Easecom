import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
  ChatBubbleLeftRightIcon,
  CheckIcon,
  ChevronRightIcon,
  ClipboardDocumentIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  MapPinIcon,
  PhoneIcon,
  SparklesIcon,
  UserIcon,
} from '@heroicons/react/24/outline'

import type { Produto } from '@/features/catalogo/produtos'
import { useVendas } from '@/features/financeiro/vendas'
import { useAuth } from '@/shared/auth/AuthContext'
import { cn } from '@/shared/lib/cn'
import { Card } from '@/shared/ui/Card'

import { AvatarFornecedor, BannerFornecedor, BotoesContato, Estrelas } from './componentes'
import {
  formatarWhatsApp,
  linkEmail,
  linkWhatsApp,
  mensagemReposicao,
  useFornecedores,
  type Fornecedor,
  type ItemFornecedor,
} from './dados'

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const percentual = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 })
const dataCurta = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})
const mesAno = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })

const DIA_MS = 86_400_000
// além do prazo de entrega, manter estoque para mais 15 dias
const DIAS_DE_SEGURANCA = 15

const STATUS_COMPRA = {
  entregue: { rotulo: 'Entregue', estilo: 'bg-[#85FA51]/25 text-[#1f5c0a]' },
  em_transito: { rotulo: 'Em trânsito', estilo: 'bg-[#005DAA]/10 text-[#005DAA]' },
  atrasada: { rotulo: 'Atrasada', estilo: 'bg-red-100 text-red-800' },
}

function lerNota(id: string) {
  try {
    return localStorage.getItem(`easecom.fornecedor-nota.${id}`) ?? ''
  } catch {
    return ''
  }
}

function salvarNota(id: string, texto: string) {
  try {
    localStorage.setItem(`easecom.fornecedor-nota.${id}`, texto)
  } catch {
    // sem armazenamento, a nota vale só nesta visita
  }
}

function useCopiar() {
  const [copiado, setCopiado] = useState<string | null>(null)
  async function copiar(chave: string, texto: string) {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(chave)
      setTimeout(() => setCopiado((atual) => (atual === chave ? null : atual)), 1800)
    } catch {
      setCopiado(null)
    }
  }
  return { copiado, copiar }
}

function Secao({
  titulo,
  subtitulo,
  children,
  className,
  acao,
}: {
  titulo: string
  subtitulo?: string
  children: React.ReactNode
  className?: string
  acao?: React.ReactNode
}) {
  return (
    <Card className={cn('p-5', className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#00305c]">{titulo}</h2>
          {subtitulo && <p className="mt-0.5 text-xs text-muted-foreground">{subtitulo}</p>}
        </div>
        {acao}
      </div>
      {children}
    </Card>
  )
}

type LinhaCatalogo = {
  item: ItemFornecedor
  produto?: Produto
  vendasPorDia: number
  diasCobertura: number | null
  sugestao: number
}

export function FornecedorPerfilPage() {
  const { id = '' } = useParams()
  const fornecedores = useFornecedores()
  const fornecedor = fornecedores.find((f) => f.id === id)

  if (!fornecedor) {
    return (
      <div className="rounded-lg border border-dashed border-border py-16 text-center">
        <p className="text-sm text-muted-foreground">Fornecedor não encontrado.</p>
        <Link
          className="mt-2 inline-block text-sm font-medium text-[#005DAA] hover:underline"
          to="/fornecedores"
        >
          Voltar aos fornecedores
        </Link>
      </div>
    )
  }
  return <PerfilFornecedor fornecedor={fornecedor} key={fornecedor.id} />
}

function PerfilFornecedor({ fornecedor }: { fornecedor: Fornecedor }) {
  const { usuario } = useAuth()
  const { vendas, anuncios, hoje } = useVendas(true)
  const { copiado, copiar } = useCopiar()
  const [nota, setNota] = useState(() => lerNota(fornecedor.id))
  const [selecao, setSelecao] = useState<Record<string, number>>({})
  const [sugestaoAplicada, setSugestaoAplicada] = useState(false)

  useEffect(() => {
    const espera = setTimeout(() => salvarNota(fornecedor.id, nota), 400)
    return () => clearTimeout(espera)
  }, [fornecedor.id, nota])

  const linhas: LinhaCatalogo[] = useMemo(() => {
    const produtos = new Map((anuncios.data ?? []).map((p) => [p.id, p]))
    const inicio = new Date(hoje.getTime() - 30 * DIA_MS)
    const vendidas = new Map<string, number>()
    for (const venda of vendas) {
      if (venda.status === 'cancelado' || venda.data < inicio) continue
      for (const item of venda.itens) {
        vendidas.set(item.produtoId, (vendidas.get(item.produtoId) ?? 0) + item.quantidade)
      }
    }
    return fornecedor.catalogo.map((item) => {
      const produto = item.produtoId ? produtos.get(item.produtoId) : undefined
      const vendasPorDia = produto ? (vendidas.get(produto.id) ?? 0) / 30 : 0
      const necessario = vendasPorDia * (fornecedor.condicoes.prazoEntregaDias + DIAS_DE_SEGURANCA)
      return {
        item,
        produto,
        vendasPorDia,
        diasCobertura: produto && vendasPorDia > 0 ? produto.estoque / vendasPorDia : null,
        // só sugere repor o que está anunciado e ativo
        sugestao:
          produto?.status === 'active' ? Math.max(Math.ceil(necessario - produto.estoque), 0) : 0,
      }
    })
  }, [anuncios.data, fornecedor, hoje, vendas])

  // pré-seleciona a sugestão de reposição na primeira vez que os dados chegam
  useEffect(() => {
    if (sugestaoAplicada || anuncios.isPending) return
    const sugeridos = Object.fromEntries(
      linhas.filter((l) => l.sugestao > 0).map((l) => [l.item.sku, l.sugestao]),
    )
    setSelecao(sugeridos)
    setSugestaoAplicada(true)
  }, [anuncios.isPending, linhas, sugestaoAplicada])

  const itensSelecionados = linhas
    .filter((l) => selecao[l.item.sku] > 0)
    .map((l) => ({ item: l.item, quantidade: selecao[l.item.sku] }))
  const totalPedido = itensSelecionados.reduce(
    (s, { item, quantidade }) => s + item.custo * quantidade,
    0,
  )
  const faltaMinimo = Math.max(fornecedor.condicoes.pedidoMinimo - totalPedido, 0)
  const mensagem = mensagemReposicao(
    fornecedor,
    itensSelecionados,
    usuario?.vendedor.nome ?? 'minha loja',
  )

  const fotos = linhas.flatMap((l) => (l.produto ? [l.produto.foto] : []))
  const totalComprado = fornecedor.compras.reduce((s, c) => s + c.valor, 0)
  const compras = [...fornecedor.compras].sort((a, b) => b.data.localeCompare(a.data))
  const maiorCompra = Math.max(...compras.map((c) => c.valor), 1)
  const { endereco } = fornecedor
  const enderecoCompleto = `${endereco.logradouro}, ${endereco.bairro}, ${endereco.cidade} - ${endereco.uf}, ${endereco.cep}`
  const temCoordenadas = endereco.latitude !== undefined && endereco.longitude !== undefined

  function alternar(sku: string, sugestao: number) {
    setSelecao((atual) => {
      const proxima = { ...atual }
      if (proxima[sku]) delete proxima[sku]
      else proxima[sku] = Math.max(sugestao, 1)
      return proxima
    })
  }

  return (
    <section className="space-y-6">
      <nav aria-label="Trilha de navegação" className="flex items-center gap-1.5 text-sm">
        <Link className="text-[#005DAA] hover:underline" to="/">
          Início
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5 text-muted-foreground" />
        <Link className="text-[#005DAA] hover:underline" to="/fornecedores">
          Fornecedores
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="truncate text-muted-foreground">{fornecedor.nome}</span>
      </nav>

      {/* Capa */}
      <Card className="overflow-hidden">
        <BannerFornecedor className="h-44" fornecedor={fornecedor} fotos={fotos} />
        <div className="flex flex-col gap-5 px-6 pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end">
            <AvatarFornecedor className="-mt-12" fornecedor={fornecedor} tamanho="lg" />
            <div className="sm:pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold text-[#00305c]">{fornecedor.nome}</h1>
                <span className="rounded-full bg-[#005DAA]/10 px-2.5 py-0.5 text-xs font-medium text-[#005DAA]">
                  {fornecedor.segmento}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {fornecedor.razaoSocial} · CNPJ {fornecedor.cnpj}
              </p>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {fornecedor.avaliacao > 0 && <Estrelas nota={fornecedor.avaliacao} />}
                <span className="inline-flex items-center gap-1">
                  <MapPinIcon className="h-4 w-4" />
                  {endereco.cidade}/{endereco.uf}
                </span>
                <span>Parceiro desde {mesAno.format(new Date(`${fornecedor.desde}T12:00`))}</span>
              </p>
            </div>
          </div>
          <BotoesContato fornecedor={fornecedor} />
        </div>
        <p className="border-t border-border bg-muted/30 px-6 py-3 text-sm text-muted-foreground">
          {fornecedor.descricao}
        </p>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-6 xl:col-span-2">
          {/* Catálogo + reposição */}
          <Secao
            subtitulo={`${fornecedor.catalogo.length} itens · custo do fornecedor cruzado com seus anúncios e o ritmo de vendas dos últimos 30 dias`}
            titulo="Catálogo do fornecedor"
          >
            {fornecedor.catalogo.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum item cadastrado ainda.
              </p>
            ) : (
              <>
                {linhas.some((l) => l.sugestao > 0) && (
                  <p className="mb-3 flex items-start gap-2 rounded-md bg-[#85FA51]/15 px-3 py-2 text-xs text-[#1f5c0a]">
                    <SparklesIcon className="mt-0.5 h-4 w-4 shrink-0" />
                    Pré-selecionamos o que vai faltar antes da próxima entrega (
                    {fornecedor.condicoes.prazoEntregaDias} dias de prazo + {DIAS_DE_SEGURANCA} de
                    segurança). Ajuste as quantidades à vontade.
                  </p>
                )}
                <div className="-mx-5 overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="border-y border-border bg-[#005DAA]/5 text-xs font-semibold uppercase tracking-wide text-[#005DAA]">
                      <tr>
                        <th className="w-10 py-2.5 pl-5">
                          <span className="sr-only">Selecionar</span>
                        </th>
                        <th className="px-3 py-2.5">Produto</th>
                        <th className="px-3 py-2.5 text-right">Custo → meu preço</th>
                        <th className="px-3 py-2.5 text-right">Margem</th>
                        <th className="px-3 py-2.5">Estoque</th>
                        <th className="py-2.5 pl-3 pr-5 text-right">Pedir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {linhas.map(({ item, produto, diasCobertura, sugestao }) => {
                        const marcado = (selecao[item.sku] ?? 0) > 0
                        const margem = produto ? (produto.preco - item.custo) / produto.preco : null
                        const critico =
                          diasCobertura !== null &&
                          diasCobertura < fornecedor.condicoes.prazoEntregaDias + 7
                        return (
                          <tr
                            className={cn('transition-colors', marcado && 'bg-[#85FA51]/10')}
                            key={item.sku}
                          >
                            <td className="py-3 pl-5">
                              <input
                                aria-label={`Incluir ${item.nome} no pedido`}
                                checked={marcado}
                                className="h-4 w-4 accent-[#005DAA]"
                                onChange={() => alternar(item.sku, sugestao)}
                                type="checkbox"
                              />
                            </td>
                            <td className="px-3 py-3">
                              <span className="flex items-center gap-3">
                                {produto ? (
                                  <img
                                    alt=""
                                    className="h-10 w-10 shrink-0 rounded-md border border-border bg-white object-contain"
                                    src={produto.foto}
                                  />
                                ) : (
                                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-dashed border-border text-[10px] text-muted-foreground">
                                    sem foto
                                  </span>
                                )}
                                <span className="min-w-0">
                                  {produto ? (
                                    <Link
                                      className="block max-w-[230px] truncate hover:text-[#005DAA] hover:underline"
                                      to={`/catalogo/${encodeURIComponent(produto.id)}`}
                                    >
                                      {item.nome}
                                    </Link>
                                  ) : (
                                    <span className="block max-w-[230px] truncate">
                                      {item.nome}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="font-mono">{item.sku}</span>
                                    {!produto && (
                                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                                        Não anunciado
                                      </span>
                                    )}
                                    {produto && produto.status !== 'active' && (
                                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                                        Em revisão
                                      </span>
                                    )}
                                  </span>
                                </span>
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                              <span className="block">{moeda.format(item.custo)}</span>
                              <span className="text-xs text-muted-foreground">
                                {produto ? `→ ${moeda.format(produto.preco)}` : 'sem anúncio'}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-right">
                              {margem === null ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                <span
                                  className={cn(
                                    'rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
                                    margem >= 0.4
                                      ? 'bg-[#85FA51]/25 text-[#1f5c0a]'
                                      : margem >= 0.2
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-red-100 text-red-800',
                                  )}
                                >
                                  {percentual.format(margem)}
                                </span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3">
                              {produto ? (
                                <>
                                  <span className="tabular-nums">{produto.estoque} un.</span>
                                  <span
                                    className={cn(
                                      'block text-xs',
                                      critico
                                        ? 'font-medium text-red-700'
                                        : 'text-muted-foreground',
                                    )}
                                  >
                                    {diasCobertura === null
                                      ? 'sem vendas recentes'
                                      : `~${Math.floor(diasCobertura)} dias`}
                                  </span>
                                </>
                              ) : (
                                <span className="text-xs text-muted-foreground">oportunidade</span>
                              )}
                            </td>
                            <td className="py-3 pl-3 pr-5 text-right">
                              <input
                                aria-label={`Quantidade de ${item.nome}`}
                                className="h-8 w-20 rounded-md border border-border bg-background px-2 text-right text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA] disabled:opacity-40"
                                disabled={!marcado}
                                min={1}
                                onChange={(e) =>
                                  setSelecao((atual) => ({
                                    ...atual,
                                    [item.sku]: Math.max(Number(e.target.value) || 0, 0),
                                  }))
                                }
                                type="number"
                                value={selecao[item.sku] ?? ''}
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="-mx-5 -mb-5 mt-4 flex flex-col gap-3 border-t border-border bg-muted/30 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="text-sm">
                    <p className="font-semibold text-[#00305c]">
                      Pedido de reposição: {itensSelecionados.length}{' '}
                      {itensSelecionados.length === 1 ? 'item' : 'itens'} ·{' '}
                      {moeda.format(totalPedido)}
                    </p>
                    {itensSelecionados.length > 0 &&
                      (faltaMinimo > 0 ? (
                        <p className="text-xs text-amber-800">
                          Faltam {moeda.format(faltaMinimo)} para o pedido mínimo de{' '}
                          {moeda.format(fornecedor.condicoes.pedidoMinimo)}
                        </p>
                      ) : (
                        <p className="text-xs text-[#1f5c0a]">✓ Atinge o pedido mínimo</p>
                      ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      aria-disabled={itensSelecionados.length === 0}
                      className={cn(
                        'inline-flex h-9 items-center gap-2 rounded-md bg-[#85FA51] px-3 text-sm font-medium text-[#00305c] hover:bg-[#6fe03c]',
                        itensSelecionados.length === 0 && 'pointer-events-none opacity-50',
                      )}
                      href={linkWhatsApp(fornecedor.whatsapp, mensagem)}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <ChatBubbleLeftRightIcon className="h-4 w-4" />
                      Enviar no WhatsApp
                    </a>
                    <a
                      aria-disabled={itensSelecionados.length === 0}
                      className={cn(
                        'inline-flex h-9 items-center gap-2 rounded-md bg-[#005DAA] px-3 text-sm font-medium text-white hover:bg-[#00497f]',
                        itensSelecionados.length === 0 && 'pointer-events-none opacity-50',
                      )}
                      href={linkEmail(
                        fornecedor.email,
                        `Pedido de reposição — ${usuario?.vendedor.nome ?? ''}`,
                        mensagem,
                      )}
                    >
                      <EnvelopeIcon className="h-4 w-4" />
                      Enviar por e-mail
                    </a>
                    <button
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted disabled:opacity-50"
                      disabled={itensSelecionados.length === 0}
                      onClick={() => void copiar('mensagem', mensagem)}
                      type="button"
                    >
                      {copiado === 'mensagem' ? (
                        <CheckIcon className="h-4 w-4 text-[#1f5c0a]" />
                      ) : (
                        <ClipboardDocumentIcon className="h-4 w-4" />
                      )}
                      {copiado === 'mensagem' ? 'Copiado!' : 'Copiar mensagem'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </Secao>

          {/* Histórico de compras */}
          <Secao
            subtitulo={`${compras.length} pedidos de compra · ${moeda.format(totalComprado)} no total`}
            titulo="Histórico de compras"
          >
            {compras.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma compra registrada.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {compras.map((compra) => (
                  <li
                    className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 py-3 sm:grid-cols-[120px_1fr_120px_110px]"
                    key={compra.id}
                  >
                    <span>
                      <span className="block font-mono text-xs font-medium text-[#00305c]">
                        {compra.id}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {dataCurta.format(new Date(`${compra.data}T12:00`))}
                      </span>
                    </span>
                    <span className="hidden sm:block">
                      <span className="block h-1.5 overflow-hidden rounded-full bg-muted">
                        <span
                          className="block h-full rounded-full bg-[#005DAA]"
                          style={{ width: `${(compra.valor / maiorCompra) * 100}%` }}
                        />
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {compra.itens} unidades
                      </span>
                    </span>
                    <span className="text-right text-sm font-semibold tabular-nums text-[#00305c]">
                      {moeda.format(compra.valor)}
                    </span>
                    <span className="col-span-2 sm:col-span-1 sm:text-right">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-1 text-xs font-medium',
                          STATUS_COMPRA[compra.status].estilo,
                        )}
                      >
                        {STATUS_COMPRA[compra.status].rotulo}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Secao>
        </div>

        <div className="flex flex-col gap-6">
          {/* Contato */}
          <Secao titulo="Contato">
            <ul className="flex flex-col gap-3 text-sm">
              <li className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#005DAA]/10 text-[#005DAA]">
                  <UserIcon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block font-medium text-[#00305c]">
                    {fornecedor.contato.nome}
                  </span>
                  <span className="text-xs text-muted-foreground">{fornecedor.contato.cargo}</span>
                </span>
              </li>
              {[
                {
                  chave: 'email',
                  icone: EnvelopeIcon,
                  texto: fornecedor.email,
                  href: linkEmail(fornecedor.email),
                },
                {
                  chave: 'whatsapp',
                  icone: ChatBubbleLeftRightIcon,
                  texto: formatarWhatsApp(fornecedor.whatsapp),
                  href: linkWhatsApp(fornecedor.whatsapp),
                  externo: true,
                },
                {
                  chave: 'telefone',
                  icone: PhoneIcon,
                  texto: fornecedor.telefone,
                  href: `tel:${fornecedor.telefone.replace(/\D/g, '')}`,
                },
                ...(fornecedor.site
                  ? [
                      {
                        chave: 'site',
                        icone: GlobeAltIcon,
                        texto: fornecedor.site,
                        href: `https://${fornecedor.site}`,
                        externo: true,
                      },
                    ]
                  : []),
              ].map(({ chave, icone: Icone, texto, href, externo }) => (
                <li className="group flex items-center gap-3" key={chave}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Icone className="h-4 w-4" />
                  </span>
                  <a
                    className="min-w-0 flex-1 truncate hover:text-[#005DAA] hover:underline"
                    href={href}
                    rel={externo ? 'noreferrer' : undefined}
                    target={externo ? '_blank' : undefined}
                  >
                    {texto}
                  </a>
                  <button
                    aria-label={`Copiar ${chave}`}
                    className="rounded p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                    onClick={() => void copiar(chave, texto)}
                    type="button"
                  >
                    {copiado === chave ? (
                      <CheckIcon className="h-4 w-4 text-[#1f5c0a]" />
                    ) : (
                      <ClipboardDocumentIcon className="h-4 w-4" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </Secao>

          {/* Endereço */}
          <Secao titulo="Endereço">
            {temCoordenadas && (
              <iframe
                className="mb-3 h-44 w-full rounded-lg border border-border"
                loading="lazy"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${endereco.longitude! - 0.006}%2C${endereco.latitude! - 0.004}%2C${endereco.longitude! + 0.006}%2C${endereco.latitude! + 0.004}&layer=mapnik&marker=${endereco.latitude}%2C${endereco.longitude}`}
                title={`Mapa de ${fornecedor.nome}`}
              />
            )}
            <p className="text-sm text-foreground">{endereco.logradouro}</p>
            <p className="text-sm text-muted-foreground">
              {endereco.bairro} · {endereco.cidade}/{endereco.uf} · CEP {endereco.cep}
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <a
                className="inline-flex items-center gap-1 font-medium text-[#005DAA] hover:underline"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoCompleto)}`}
                rel="noreferrer"
                target="_blank"
              >
                Abrir no Google Maps <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
              </a>
              <button
                className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground"
                onClick={() => void copiar('endereco', enderecoCompleto)}
                type="button"
              >
                {copiado === 'endereco' ? (
                  <CheckIcon className="h-4 w-4 text-[#1f5c0a]" />
                ) : (
                  <ClipboardDocumentIcon className="h-4 w-4" />
                )}
                {copiado === 'endereco' ? 'Copiado!' : 'Copiar endereço'}
              </button>
            </div>
          </Secao>

          {/* Condições + desempenho */}
          <Secao titulo="Condições comerciais">
            <dl className="grid grid-cols-2 gap-3">
              {[
                [
                  'Prazo de entrega',
                  fornecedor.condicoes.prazoEntregaDias
                    ? `${fornecedor.condicoes.prazoEntregaDias} dias`
                    : 'A combinar',
                ],
                [
                  'Pedido mínimo',
                  fornecedor.condicoes.pedidoMinimo
                    ? moeda.format(fornecedor.condicoes.pedidoMinimo)
                    : 'A combinar',
                ],
                ['Pagamento', fornecedor.condicoes.pagamento],
                ['Frete', fornecedor.condicoes.frete],
              ].map(([rotulo, valor]) => (
                <div className="rounded-lg bg-muted/50 p-3" key={rotulo}>
                  <dt className="text-xs text-muted-foreground">{rotulo}</dt>
                  <dd className="mt-0.5 text-sm font-medium text-[#00305c]">{valor}</dd>
                </div>
              ))}
            </dl>
            {fornecedor.entregasNoPrazo > 0 && (
              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="text-muted-foreground">Entregas no prazo</span>
                  <span className="font-semibold text-[#00305c]">
                    {percentual.format(fornecedor.entregasNoPrazo)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      fornecedor.entregasNoPrazo >= 0.9
                        ? 'bg-[#85FA51]'
                        : fornecedor.entregasNoPrazo >= 0.8
                          ? 'bg-amber-400'
                          : 'bg-red-500',
                    )}
                    style={{ width: `${fornecedor.entregasNoPrazo * 100}%` }}
                  />
                </div>
              </div>
            )}
          </Secao>

          {/* Anotações */}
          <Secao subtitulo="Só você vê · salvas neste navegador" titulo="Anotações">
            <textarea
              aria-label="Anotações sobre o fornecedor"
              className="min-h-28 w-full resize-y rounded-md border border-border bg-background p-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA]"
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ex.: negociar 5% de desconto acima de R$ 3 mil; falar com o Ricardo às terças."
              value={nota}
            />
          </Secao>

          <Link
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-[#005DAA]"
            to="/fornecedores"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Voltar aos fornecedores
          </Link>
        </div>
      </div>
    </section>
  )
}
