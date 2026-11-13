import { useSyncExternalStore } from 'react'

// Fornecedores ainda não têm backend: estes são dados de exemplo. Os itens do
// catálogo de cada fornecedor apontam para anúncios reais do Mercado Livre
// (produtoId) — quando o anúncio existe, a tela cruza custo x preço x estoque.

export type ItemFornecedor = {
  sku: string
  nome: string
  custo: number
  // id do anúncio no Mercado Livre que este item abastece
  produtoId?: string
}

export type CompraFornecedor = {
  id: string
  data: string
  valor: number
  itens: number
  status: 'entregue' | 'em_transito' | 'atrasada'
}

export type Fornecedor = {
  id: string
  nome: string
  razaoSocial: string
  cnpj: string
  segmento: string
  descricao: string
  desde: string
  avaliacao: number
  entregasNoPrazo: number
  contato: { nome: string; cargo: string }
  email: string
  whatsapp: string // só dígitos, com DDI
  telefone: string
  site?: string
  endereco: {
    logradouro: string
    bairro: string
    cidade: string
    uf: string
    cep: string
    latitude?: number
    longitude?: number
  }
  condicoes: {
    prazoEntregaDias: number
    pedidoMinimo: number
    pagamento: string
    frete: string
  }
  // par de cores do banner
  cores: [string, string]
  catalogo: ItemFornecedor[]
  compras: CompraFornecedor[]
}

export const FORNECEDORES: Fornecedor[] = [
  {
    id: 'tech-import',
    nome: 'Tech Import LTDA',
    razaoSocial: 'Tech Import Comércio de Eletrônicos LTDA',
    cnpj: '12.345.678/0001-90',
    segmento: 'Eletrônicos',
    descricao:
      'Importadora de eletrônicos e acessórios de áudio e conectividade, com estoque próprio na região da Santa Ifigênia.',
    desde: '2023-03-14',
    avaliacao: 4.7,
    entregasNoPrazo: 0.94,
    contato: { nome: 'Ricardo Nogueira', cargo: 'Gerente comercial' },
    email: 'contato@techimport.com',
    whatsapp: '5511987650001',
    telefone: '(11) 3221-0001',
    site: 'techimport.com',
    endereco: {
      logradouro: 'Rua Santa Ifigênia, 295 — Loja 12',
      bairro: 'Santa Ifigênia',
      cidade: 'São Paulo',
      uf: 'SP',
      cep: '01207-001',
      latitude: -23.5413,
      longitude: -46.637,
    },
    condicoes: {
      prazoEntregaDias: 3,
      pedidoMinimo: 1500,
      pagamento: 'Boleto 30/60 dias',
      frete: 'CIF acima de R$ 3.000',
    },
    cores: ['#005DAA', '#00305c'],
    catalogo: [
      {
        sku: 'TI-FONE-RS21',
        nome: 'Fone Bluetooth TWS RS21 Branco',
        custo: 62.5,
        produtoId: 'MLB5210041669',
      },
      {
        sku: 'TI-HUB-C7',
        nome: 'Hub USB-C 7 em 1 Lotus LT-T701',
        custo: 38.9,
        produtoId: 'MLB7613803874',
      },
      {
        sku: 'TI-HDMI-10M',
        nome: 'Cabo HDMI 4K 10 m Knup',
        custo: 11.2,
        produtoId: 'MLB7613799512',
      },
      {
        sku: 'TI-IP15PM-NAT',
        nome: 'iPhone 15 Pro Max 256 GB Titânio Natural',
        custo: 3890,
        produtoId: 'MLB7613723722',
      },
      {
        sku: 'TI-IP15PM-AZL',
        nome: 'iPhone 15 Pro Max 256 GB Titânio Azul',
        custo: 3890,
        produtoId: 'MLB7613723728',
      },
      { sku: 'TI-CARR-65W', nome: 'Carregador GaN 65 W USB-C', custo: 54.9 },
      { sku: 'TI-SSD-1TB', nome: 'SSD Portátil 1 TB USB 3.2', custo: 289 },
    ],
    compras: [
      { id: 'PC-2041', data: '2026-09-26', valor: 4820.4, itens: 96, status: 'entregue' },
      { id: 'PC-1987', data: '2026-08-30', valor: 8790, itens: 4, status: 'entregue' },
      { id: 'PC-1932', data: '2026-08-04', valor: 3120.5, itens: 80, status: 'entregue' },
      { id: 'PC-1870', data: '2026-07-02', valor: 2655.8, itens: 64, status: 'entregue' },
      { id: 'PC-2066', data: '2026-10-05', valor: 1980, itens: 40, status: 'em_transito' },
    ],
  },
  {
    id: 'confeccoes-real',
    nome: 'Confecções Real',
    razaoSocial: 'Real Confecções e Bolsas EIRELI',
    cnpj: '23.456.789/0001-01',
    segmento: 'Bolsas e têxteis',
    descricao:
      'Fábrica de mochilas, bolsas e confecção em geral no polo têxtil de Brusque, com personalização sob encomenda.',
    desde: '2024-01-22',
    avaliacao: 4.3,
    entregasNoPrazo: 0.86,
    contato: { nome: 'Mariana Real', cargo: 'Sócia' },
    email: 'vendas@real.com.br',
    whatsapp: '5547987650002',
    telefone: '(47) 3351-0002',
    endereco: {
      logradouro: 'Rua Azambuja, 1200 — Galpão 3',
      bairro: 'Azambuja',
      cidade: 'Brusque',
      uf: 'SC',
      cep: '88353-000',
      latitude: -27.1093,
      longitude: -48.9189,
    },
    condicoes: {
      prazoEntregaDias: 12,
      pedidoMinimo: 800,
      pagamento: 'Pix com 5% de desconto ou boleto 28 dias',
      frete: 'FOB (por conta do comprador)',
    },
    cores: ['#1f5c0a', '#00305c'],
    catalogo: [
      {
        sku: 'CR-MOC-EXEC',
        nome: 'Mochila Executiva Antifurto 16"',
        custo: 54,
        produtoId: 'MLB7613840334',
      },
      { sku: 'CR-NEC-ORG', nome: 'Necessaire Organizadora de Cabos', custo: 14.9 },
      { sku: 'CR-CAPA-NB15', nome: 'Capa Neoprene para Notebook 15"', custo: 19.5 },
      { sku: 'CR-POCHETE', nome: 'Pochete Esportiva Impermeável', custo: 16.8 },
    ],
    compras: [
      { id: 'PC-2013', data: '2026-09-12', valor: 1620, itens: 30, status: 'entregue' },
      { id: 'PC-1899', data: '2026-07-18', valor: 1080, itens: 20, status: 'entregue' },
      { id: 'PC-2072', data: '2026-09-29', valor: 864, itens: 16, status: 'atrasada' },
    ],
  },
  {
    id: 'acessorios-sp',
    nome: 'Acessórios SP',
    razaoSocial: 'Acessórios SP Distribuidora LTDA',
    cnpj: '34.567.890/0001-12',
    segmento: 'Acessórios de escritório',
    descricao:
      'Distribuidora de acessórios para home office e setup: suportes, mousepads e iluminação, com entrega expressa na Grande SP.',
    desde: '2023-09-05',
    avaliacao: 4.8,
    entregasNoPrazo: 0.97,
    contato: { nome: 'Fábio Tanaka', cargo: 'Representante' },
    email: 'compras@acessp.com',
    whatsapp: '5511987650003',
    telefone: '(11) 3229-0003',
    endereco: {
      logradouro: 'Rua 25 de Março, 1000 — Sala 4',
      bairro: 'Centro',
      cidade: 'São Paulo',
      uf: 'SP',
      cep: '01021-200',
      latitude: -23.5431,
      longitude: -46.6308,
    },
    condicoes: {
      prazoEntregaDias: 2,
      pedidoMinimo: 500,
      pagamento: 'Boleto 28 dias',
      frete: 'Grátis na Grande SP',
    },
    cores: ['#005DAA', '#1f5c0a'],
    catalogo: [
      {
        sku: 'AS-MP-9040',
        nome: 'Mousepad Speed 90x40 cm',
        custo: 18.9,
        produtoId: 'MLB5210037439',
      },
      {
        sku: 'AS-SUP-NB',
        nome: 'Suporte Notebook Alumínio Dobrável',
        custo: 27.4,
        produtoId: 'MLB5210056941',
      },
      {
        sku: 'AS-SUP-F80N',
        nome: 'Suporte Articulado Monitor ELG F80N',
        custo: 104,
        produtoId: 'MLB7613813398',
      },
      {
        sku: 'AS-LUM-BCO',
        nome: 'Luminária Articulada Base Garra Branca',
        custo: 32.9,
        produtoId: 'MLB7613794536',
      },
      {
        sku: 'AS-LUM-PTO',
        nome: 'Luminária Articulada Base Garra Preta',
        custo: 32.9,
        produtoId: 'MLB5210064417',
      },
      { sku: 'AS-APOIO-PE', nome: 'Apoio Ergonômico para Pés', custo: 39.9 },
    ],
    compras: [
      { id: 'PC-2058', data: '2026-10-01', valor: 1745.6, itens: 52, status: 'entregue' },
      { id: 'PC-1996', data: '2026-09-03', valor: 2210.3, itens: 61, status: 'entregue' },
      { id: 'PC-1941', data: '2026-08-08', valor: 1388.5, itens: 40, status: 'entregue' },
      { id: 'PC-1902', data: '2026-07-11', valor: 980.2, itens: 28, status: 'entregue' },
    ],
  },
  {
    id: 'garrafas-termicos',
    nome: 'Garrafas & Térmicos',
    razaoSocial: 'G&T Utilidades Térmicas LTDA',
    cnpj: '45.678.901/0001-23',
    segmento: 'Casa e cozinha',
    descricao:
      'Fabricante de garrafas, copos e potes térmicos em aço inox. Linha nova ainda não anunciada no seu catálogo.',
    desde: '2025-11-03',
    avaliacao: 4.1,
    entregasNoPrazo: 0.81,
    contato: { nome: 'Paulo Henrique Lins', cargo: 'Vendas B2B' },
    email: 'pedidos@garrafas.com',
    whatsapp: '5547987650004',
    telefone: '(47) 3433-0004',
    endereco: {
      logradouro: 'Rua XV de Novembro, 3000',
      bairro: 'Glória',
      cidade: 'Joinville',
      uf: 'SC',
      cep: '89216-201',
      latitude: -26.2995,
      longitude: -48.8638,
    },
    condicoes: {
      prazoEntregaDias: 7,
      pedidoMinimo: 1000,
      pagamento: 'Boleto 30 dias',
      frete: 'CIF acima de R$ 2.000',
    },
    cores: ['#00305c', '#005DAA'],
    catalogo: [
      { sku: 'GT-GAR-750', nome: 'Garrafa Térmica Inox 750 ml', custo: 34.9 },
      { sku: 'GT-COPO-473', nome: 'Copo Térmico com Tampa 473 ml', custo: 22.5 },
      { sku: 'GT-POTE-1L', nome: 'Pote Térmico Marmita 1 L', custo: 41 },
    ],
    compras: [{ id: 'PC-1789', data: '2026-05-20', valor: 1046, itens: 30, status: 'entregue' }],
  },
]

// --- Fornecedores cadastrados na tela (em memória) ------------------------------------------

let cadastrados: Fornecedor[] = []
const ouvintes = new Set<() => void>()

export function cadastrarFornecedor(fornecedor: Fornecedor) {
  cadastrados = [...cadastrados, fornecedor]
  ouvintes.forEach((ouvinte) => ouvinte())
}

export function useFornecedores() {
  const extras = useSyncExternalStore(
    (ouvinte) => {
      ouvintes.add(ouvinte)
      return () => ouvintes.delete(ouvinte)
    },
    () => cadastrados,
  )
  return extras.length ? [...FORNECEDORES, ...extras] : FORNECEDORES
}

// --- Contato ------------------------------------------------------------------------------------

export function linkWhatsApp(numero: string, mensagem?: string) {
  const texto = mensagem ? `?text=${encodeURIComponent(mensagem)}` : ''
  return `https://wa.me/${numero.replace(/\D/g, '')}${texto}`
}

export function linkEmail(email: string, assunto?: string, corpo?: string) {
  const params = new URLSearchParams()
  if (assunto) params.set('subject', assunto)
  if (corpo) params.set('body', corpo)
  const query = params.toString().replace(/\+/g, '%20')
  return `mailto:${email}${query ? `?${query}` : ''}`
}

export function formatarWhatsApp(numero: string) {
  const d = numero.replace(/\D/g, '').replace(/^55/, '')
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : numero
}

export function iniciaisFornecedor(nome: string) {
  const palavras = nome
    .replace(/[^\p{L}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
  return ((palavras[0]?.[0] ?? '') + (palavras[1]?.[0] ?? '')).toUpperCase() || '?'
}

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function mensagemReposicao(
  fornecedor: Fornecedor,
  itens: { item: ItemFornecedor; quantidade: number }[],
  nomeLoja: string,
) {
  const total = itens.reduce((soma, { item, quantidade }) => soma + item.custo * quantidade, 0)
  return [
    `Olá, ${fornecedor.contato.nome.split(' ')[0]}! Tudo bem?`,
    '',
    `Aqui é da ${nomeLoja}. Gostaria de fazer um pedido de reposição:`,
    '',
    ...itens.map(
      ({ item, quantidade }) =>
        `• ${quantidade}x ${item.nome} (SKU ${item.sku}) — ${moeda.format(item.custo)} un.`,
    ),
    '',
    `Total estimado: ${moeda.format(total)}`,
    `Condição: ${fornecedor.condicoes.pagamento}`,
    '',
    'Pode confirmar a disponibilidade e o prazo de entrega? Obrigado!',
  ].join('\n')
}
