import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BuildingStorefrontIcon,
  ClockIcon,
  CubeIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PlusIcon,
  ShoppingBagIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

import { useAnunciosMercadoLivre } from '@/features/catalogo/produtos'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { Input } from '@/shared/ui/Input'
import { Label } from '@/shared/ui/Label'

import { AvatarFornecedor, BannerFornecedor, BotoesContato, Estrelas } from './componentes'
import { cadastrarFornecedor, useFornecedores, type Fornecedor } from './dados'

const moedaCompacta = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
})
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

type NovoFornecedorForm = {
  nome: string
  email: string
  whatsapp: string
  segmento: string
  cidade: string
  uf: string
}

const FORM_VAZIO: NovoFornecedorForm = {
  nome: '',
  email: '',
  whatsapp: '',
  segmento: '',
  cidade: '',
  uf: '',
}

const ORDENS = {
  avaliacao: 'Melhor avaliação',
  compras: 'Mais comprados',
  nome: 'Nome (A–Z)',
}

const totalCompras = (f: Fornecedor) => f.compras.reduce((soma, c) => soma + c.valor, 0)

export function FornecedoresPage() {
  const fornecedores = useFornecedores()
  const anuncios = useAnunciosMercadoLivre()
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')
  const [segmento, setSegmento] = useState<string | null>(null)
  const [ordem, setOrdem] = useState<keyof typeof ORDENS>('avaliacao')
  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState<NovoFornecedorForm>(FORM_VAZIO)

  const fotosPorProduto = new Map((anuncios.data ?? []).map((p) => [p.id, p.foto]))
  const vinculados = (f: Fornecedor) =>
    f.catalogo.filter((i) => i.produtoId && fotosPorProduto.has(i.produtoId))

  const segmentos = [...new Set(fornecedores.map((f) => f.segmento))]
  const termo = busca.trim().toLocaleLowerCase('pt-BR')
  const filtrados = fornecedores
    .filter(
      (f) =>
        (!segmento || f.segmento === segmento) &&
        (!termo ||
          [f.nome, f.segmento, f.endereco.cidade, f.contato.nome, ...f.catalogo.map((i) => i.nome)]
            .join(' ')
            .toLocaleLowerCase('pt-BR')
            .includes(termo)),
    )
    .sort((a, b) =>
      ordem === 'nome'
        ? a.nome.localeCompare(b.nome, 'pt-BR')
        : ordem === 'compras'
          ? totalCompras(b) - totalCompras(a)
          : b.avaliacao - a.avaliacao,
    )

  const anoAtual = new Date().getFullYear()
  const comprasNoAno = fornecedores
    .flatMap((f) => f.compras)
    .filter((c) => new Date(c.data).getFullYear() === anoAtual)
    .reduce((soma, c) => soma + c.valor, 0)
  const prazoMedio =
    fornecedores.reduce((soma, f) => soma + f.condicoes.prazoEntregaDias, 0) /
    Math.max(fornecedores.length, 1)

  function handleSubmit(evento: React.FormEvent) {
    evento.preventDefault()
    const id = `novo-${Date.now()}`
    cadastrarFornecedor({
      id,
      nome: form.nome.trim(),
      razaoSocial: form.nome.trim(),
      cnpj: '—',
      segmento: form.segmento.trim() || 'Geral',
      descricao: 'Fornecedor cadastrado recentemente.',
      desde: new Date().toISOString().slice(0, 10),
      avaliacao: 0,
      entregasNoPrazo: 0,
      contato: { nome: form.nome.trim(), cargo: 'Contato principal' },
      email: form.email.trim(),
      whatsapp: `55${form.whatsapp.replace(/\D/g, '')}`,
      telefone: form.whatsapp,
      endereco: {
        logradouro: '—',
        bairro: '—',
        cidade: form.cidade.trim() || '—',
        uf: form.uf.trim().toUpperCase() || '—',
        cep: '—',
      },
      condicoes: {
        prazoEntregaDias: 0,
        pedidoMinimo: 0,
        pagamento: 'A combinar',
        frete: 'A combinar',
      },
      cores: ['#005DAA', '#00305c'],
      catalogo: [],
      compras: [],
    })
    setModalAberto(false)
    navigate(`/fornecedores/${id}`)
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#00305c]">Fornecedores</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quem abastece sua loja, o que cada um fornece e como falar com eles rapidinho.
          </p>
        </div>
        <Button
          className="flex items-center gap-2 bg-[#005DAA] text-white hover:bg-[#00497f]"
          onClick={() => {
            setForm(FORM_VAZIO)
            setModalAberto(true)
          }}
          type="button"
        >
          <PlusIcon className="h-4 w-4" />
          Novo fornecedor
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            icone: BuildingStorefrontIcon,
            rotulo: 'Fornecedores ativos',
            valor: String(fornecedores.length),
          },
          {
            icone: CubeIcon,
            rotulo: 'Produtos vinculados ao catálogo',
            valor: String(fornecedores.reduce((soma, f) => soma + vinculados(f).length, 0)),
          },
          {
            icone: ShoppingBagIcon,
            rotulo: `Compras em ${anoAtual}`,
            valor: moeda.format(comprasNoAno),
          },
          {
            icone: ClockIcon,
            rotulo: 'Prazo médio de entrega',
            valor: `${prazoMedio.toFixed(0)} dias`,
          },
        ].map(({ icone: Icone, rotulo, valor }) => (
          <Card className="flex items-center gap-4 p-5" key={rotulo}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#005DAA]/10 text-[#005DAA]">
              <Icone className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-xs text-muted-foreground">{rotulo}</span>
              <span className="text-xl font-semibold text-[#00305c]">{valor}</span>
            </span>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative lg:w-80">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Buscar fornecedor"
            className="pl-9 focus-visible:ring-[#005DAA]"
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar fornecedor, cidade ou produto"
            value={busca}
          />
        </div>
        <div className="flex flex-1 flex-wrap gap-2">
          {[null, ...segmentos].map((s) => (
            <button
              aria-pressed={segmento === s}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA]',
                segmento === s
                  ? 'border-[#005DAA] bg-[#005DAA] text-white'
                  : 'border-border bg-background hover:bg-[#85FA51]/10',
              )}
              key={s ?? 'todos'}
              onClick={() => setSegmento(s)}
              type="button"
            >
              {s ?? 'Todos'}
            </button>
          ))}
        </div>
        <select
          aria-label="Ordenar fornecedores"
          className="h-10 rounded-md border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA]"
          onChange={(e) => setOrdem(e.target.value as keyof typeof ORDENS)}
          value={ordem}
        >
          {Object.entries(ORDENS).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </select>
      </div>

      <ul className="grid gap-5 lg:grid-cols-2">
        {filtrados.map((fornecedor) => {
          const fotos = vinculados(fornecedor).map((i) => fotosPorProduto.get(i.produtoId!)!)
          return (
            <li key={fornecedor.id}>
              <Card
                className="group cursor-pointer overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg"
                onClick={() => navigate(`/fornecedores/${fornecedor.id}`)}
              >
                <BannerFornecedor className="h-28" fornecedor={fornecedor} fotos={fotos} />
                <div className="px-5 pb-5">
                  <div className="relative z-10 -mt-8 flex items-end justify-between gap-3">
                    <AvatarFornecedor fornecedor={fornecedor} />
                    {fornecedor.avaliacao > 0 && <Estrelas nota={fornecedor.avaliacao} />}
                  </div>
                  <div className="mt-3">
                    <Link
                      className="text-lg font-semibold text-[#00305c] hover:text-[#005DAA] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA]"
                      onClick={(e) => e.stopPropagation()}
                      to={`/fornecedores/${fornecedor.id}`}
                    >
                      {fornecedor.nome}
                    </Link>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                      <span className="rounded-full bg-[#005DAA]/10 px-2 py-0.5 text-xs font-medium text-[#005DAA]">
                        {fornecedor.segmento}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPinIcon className="h-3.5 w-3.5" />
                        {fornecedor.endereco.cidade}/{fornecedor.endereco.uf}
                      </span>
                      <span className="truncate">{fornecedor.email}</span>
                    </p>
                  </div>

                  <dl className="mt-4 grid grid-cols-3 divide-x divide-border rounded-lg border border-border text-center">
                    <div className="px-2 py-2.5">
                      <dt className="text-[11px] text-muted-foreground">Produtos vinculados</dt>
                      <dd className="text-base font-semibold text-[#00305c]">
                        {vinculados(fornecedor).length}
                        <span className="text-xs font-normal text-muted-foreground">
                          {' '}
                          / {fornecedor.catalogo.length}
                        </span>
                      </dd>
                    </div>
                    <div className="px-2 py-2.5">
                      <dt className="text-[11px] text-muted-foreground">Entrega</dt>
                      <dd className="text-base font-semibold text-[#00305c]">
                        {fornecedor.condicoes.prazoEntregaDias
                          ? `${fornecedor.condicoes.prazoEntregaDias} dias`
                          : '—'}
                      </dd>
                    </div>
                    <div className="px-2 py-2.5">
                      <dt className="text-[11px] text-muted-foreground">Comprado</dt>
                      <dd className="text-base font-semibold text-[#00305c]">
                        {moedaCompacta.format(totalCompras(fornecedor))}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <BotoesContato compacto fornecedor={fornecedor} />
                    <span className="text-sm font-medium text-[#005DAA] group-hover:underline">
                      Ver perfil →
                    </span>
                  </div>
                </div>
              </Card>
            </li>
          )
        })}
      </ul>

      {filtrados.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Nenhum fornecedor encontrado.
        </p>
      )}

      {modalAberto && (
        <div
          aria-labelledby="titulo-cadastro-fornecedor"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setModalAberto(false)}
          role="dialog"
        >
          <div
            className="relative w-full max-w-md rounded-lg bg-background p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              aria-label="Fechar cadastro"
              className="absolute right-3 top-3 rounded-md p-2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA]"
              onClick={() => setModalAberto(false)}
              type="button"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
            <h2
              className="mb-4 text-lg font-semibold text-[#00305c]"
              id="titulo-cadastro-fornecedor"
            >
              Novo fornecedor
            </h2>
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  required
                  value={form.nome}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    required
                    type="email"
                    value={form.email}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    inputMode="tel"
                    onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
                    placeholder="(11) 91234-5678"
                    value={form.whatsapp}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="segmento">Segmento</Label>
                <Input
                  id="segmento"
                  list="segmentos-existentes"
                  onChange={(e) => setForm((f) => ({ ...f, segmento: e.target.value }))}
                  placeholder="Ex.: Eletrônicos"
                  value={form.segmento}
                />
                <datalist id="segmentos-existentes">
                  {segmentos.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
              <div className="grid grid-cols-[1fr_80px] gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))}
                    value={form.cidade}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="uf">UF</Label>
                  <Input
                    id="uf"
                    maxLength={2}
                    onChange={(e) => setForm((f) => ({ ...f, uf: e.target.value }))}
                    value={form.uf}
                  />
                </div>
              </div>
              <div className="mt-2 flex justify-end gap-2">
                <Button onClick={() => setModalAberto(false)} type="button" variant="outline">
                  Cancelar
                </Button>
                <Button className="bg-[#005DAA] text-white hover:bg-[#00497f]" type="submit">
                  Cadastrar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
