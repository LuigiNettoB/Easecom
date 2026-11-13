import { useSyncExternalStore } from 'react'

export type StatusCanal = 'integrado' | 'em_breve' | 'planejado'

export type Canal = {
  id: string
  nome: string
  logo: string
  // fundo do banner e cor de destaque da marca
  cor: string
  destaque: string
  slogan: string
  descricao: string
  status: StatusCanal
  // valores de referência — conferir sempre no site do canal
  comissao: string
  logistica: string
  publico: string
  pontosFortes: string[]
  requisitos: string[]
  site?: string
}

export const CANAIS: Canal[] = [
  {
    id: 'mercado-livre',
    nome: 'Mercado Livre',
    logo: '/canais/mercadolivre.svg',
    cor: '#FFE600',
    destaque: '#2D3277',
    slogan: 'O maior marketplace da América Latina',
    descricao:
      'Líder em e-commerce no Brasil, com logística própria (Mercado Envios e Full), pagamentos pelo Mercado Pago e Mercado Ads para impulsionar anúncios.',
    status: 'integrado',
    comissao: '≈ 10% a 19% por venda',
    logistica: 'Mercado Envios · Full',
    publico: 'Todas as categorias',
    pontosFortes: ['Eletrônicos', 'Casa', 'Ferramentas', 'Moda'],
    requisitos: ['CPF ou CNPJ', 'Conta Mercado Pago'],
    site: 'https://vendedores.mercadolivre.com.br',
  },
  {
    id: 'amazon',
    nome: 'Amazon',
    logo: '/canais/amazon.svg',
    cor: '#232F3E',
    destaque: '#FF9900',
    slogan: 'Alcance de clientes Prime em todo o país',
    descricao:
      'Marketplace com forte reputação de entrega rápida. O programa FBA guarda e envia seus produtos, e os anúncios ganham o selo Prime.',
    status: 'em_breve',
    comissao: '≈ 8% a 15% por venda',
    logistica: 'FBA · DBA · Envio próprio',
    publico: 'Compradores de alto ticket',
    pontosFortes: ['Livros', 'Eletrônicos', 'Casa', 'Beleza'],
    requisitos: ['CNPJ', 'Nota fiscal', 'Código de barras (EAN)'],
    site: 'https://venda.amazon.com.br',
  },
  {
    id: 'shopee',
    nome: 'Shopee',
    logo: '/canais/shopee.svg',
    cor: '#EE4D2D',
    destaque: '#FFFFFF',
    slogan: 'Volume alto e público jovem no app',
    descricao:
      'Plataforma mobile-first, com cupons, frete grátis subsidiado e campanhas mensais (9.9, 10.10, 11.11) que geram picos de venda.',
    status: 'em_breve',
    comissao: '≈ 14% a 20% + taxa fixa',
    logistica: 'Shopee Xpress · Coleta',
    publico: 'Ticket médio mais baixo',
    pontosFortes: ['Acessórios', 'Moda', 'Beleza', 'Casa'],
    requisitos: ['CPF ou CNPJ'],
    site: 'https://seller.shopee.com.br',
  },
  {
    id: 'magalu',
    nome: 'Magalu',
    logo: '/canais/magalu.svg',
    cor: '#0086FF',
    destaque: '#FFFFFF',
    slogan: 'Vitrine nacional com lojas físicas',
    descricao:
      'Marketplace do Magazine Luiza, com retirada em lojas físicas e o Magalu Entregas. Forte em eletro e casa.',
    status: 'em_breve',
    comissao: '≈ 10% a 16% + taxa fixa',
    logistica: 'Magalu Entregas',
    publico: 'Eletro, casa e móveis',
    pontosFortes: ['Eletrodomésticos', 'Móveis', 'Eletrônicos'],
    requisitos: ['CNPJ', 'Nota fiscal'],
  },
  {
    id: 'tiktok-shop',
    nome: 'TikTok Shop',
    logo: '/canais/tiktok.svg',
    cor: '#000000',
    destaque: '#25F4EE',
    slogan: 'Venda dentro dos vídeos e lives',
    descricao:
      'Social commerce: produtos marcados em vídeos e transmissões ao vivo, com afiliados e criadores divulgando por comissão.',
    status: 'planejado',
    comissao: 'Comissão + programa de afiliados',
    logistica: 'Envio pelo vendedor',
    publico: 'Geração Z e millennials',
    pontosFortes: ['Beleza', 'Moda', 'Gadgets', 'Virais'],
    requisitos: ['CNPJ', 'Conteúdo em vídeo'],
    site: 'https://seller-br.tiktok.com',
  },
  {
    id: 'aliexpress',
    nome: 'AliExpress',
    logo: '/canais/aliexpress.svg',
    cor: '#E62E04',
    destaque: '#FFFFFF',
    slogan: 'Vitrine global com vendedores locais',
    descricao:
      'O AliExpress abriu espaço para vendedores brasileiros com entrega nacional, competindo com o cross-border em prazo de entrega.',
    status: 'planejado',
    comissao: '≈ 5% a 8% por venda',
    logistica: 'Envio nacional pelo vendedor',
    publico: 'Caçadores de preço',
    pontosFortes: ['Eletrônicos', 'Acessórios', 'Casa'],
    requisitos: ['CNPJ'],
    site: 'https://sell.aliexpress.com',
  },
  {
    id: 'shein',
    nome: 'Shein',
    logo: '/canais/shein.svg',
    cor: '#111111',
    destaque: '#FFFFFF',
    slogan: 'Moda com tráfego gigante no app',
    descricao:
      'Marketplace aberto a vendedores nacionais, com foco em moda, acessórios e casa — categorias que mais giram no app.',
    status: 'planejado',
    comissao: '≈ 16% por venda',
    logistica: 'Envio pelo vendedor',
    publico: 'Moda e lifestyle',
    pontosFortes: ['Moda', 'Acessórios', 'Casa'],
    requisitos: ['CNPJ', 'Fotos padronizadas'],
  },
  {
    id: 'americanas',
    nome: 'Americanas',
    logo: '/canais/americanas.svg',
    cor: '#E60014',
    destaque: '#FFFFFF',
    slogan: 'Marca tradicional do varejo brasileiro',
    descricao:
      'Marketplace da Americanas, com lojas físicas para retirada e público fiel em datas como Black Friday e Natal.',
    status: 'planejado',
    comissao: '≈ 12% a 16% por venda',
    logistica: 'Americanas Entrega',
    publico: 'Varejo geral',
    pontosFortes: ['Brinquedos', 'Eletrônicos', 'Casa'],
    requisitos: ['CNPJ', 'Nota fiscal'],
  },
  {
    id: 'casas-bahia',
    nome: 'Casas Bahia',
    logo: '/canais/casasbahia.svg',
    cor: '#003DA5',
    destaque: '#FFD100',
    slogan: 'Forte em eletro e móveis parcelados',
    descricao:
      'Marketplace do Grupo Casas Bahia, com crediário próprio que facilita a venda de itens de maior valor.',
    status: 'planejado',
    comissao: '≈ 12% a 18% por venda',
    logistica: 'Envio pelo vendedor · CB Entrega',
    publico: 'Eletro e móveis',
    pontosFortes: ['Eletrodomésticos', 'Móveis', 'Celulares'],
    requisitos: ['CNPJ', 'Nota fiscal'],
  },
]

export const ROTULOS_STATUS: Record<StatusCanal, string> = {
  integrado: 'Integração disponível',
  em_breve: 'Em breve',
  planejado: 'No radar',
}

// --- Lista de interesse ("avise-me"), guardada neste navegador -----------------------------

const CHAVE = 'easecom.canais-interesse'

function lerInteresse(): Set<string> {
  try {
    const valor = JSON.parse(localStorage.getItem(CHAVE) ?? '[]')
    return new Set(Array.isArray(valor) ? valor : [])
  } catch {
    return new Set()
  }
}

let interesse = lerInteresse()
const ouvintes = new Set<() => void>()

export function alternarInteresse(id: string) {
  const proximo = new Set(interesse)
  if (proximo.has(id)) proximo.delete(id)
  else proximo.add(id)
  interesse = proximo
  try {
    localStorage.setItem(CHAVE, JSON.stringify([...proximo]))
  } catch {
    // sem armazenamento: vale até recarregar
  }
  ouvintes.forEach((ouvinte) => ouvinte())
}

export function useInteresse() {
  return useSyncExternalStore(
    (ouvinte) => {
      ouvintes.add(ouvinte)
      return () => ouvintes.delete(ouvinte)
    },
    () => interesse,
  )
}
