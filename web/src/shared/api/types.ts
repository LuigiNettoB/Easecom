export type Perfil = 'ADMINISTRADOR' | 'OPERADOR' | 'FINANCEIRO'

export interface Vendedor {
  id: string
  nome: string
}

export interface Usuario {
  id: string
  email: string
  nome: string
  perfil: Perfil
  vendedor: Vendedor
  criado_em: string
  foto_perfil_url: string | null
  foto_banner_url: string | null
}

export interface TokensAutenticacao {
  access: string
  refresh: string
}

export interface CadastroEntrada {
  nome_vendedor: string
  nome_usuario: string
  email: string
  senha: string
}

export interface LoginEntrada {
  email: string
  password: string
}

export interface ErroDeCampo {
  campo: string
  mensagens: string[]
}

export interface ErroApi {
  timestamp: string
  status: number
  codigo: string
  mensagem: string
  erros_de_campo?: ErroDeCampo[]
}

/** Dados simulados de um fixture temporário — não é um contrato real de negócio. */
export interface ProdutoResumoCanal {
  id: string
  title: string
  price: number
  available_quantity: number
  sold_quantity: number
  status: string
  thumbnail: string
  permalink: string
}

export interface PedidoResumoCanal {
  id: number
  status: string
  date_created: string
  total_amount: number
  paid_amount: number
  buyer_nickname: string
}

export interface ResumoCanalMercadoLivre {
  vendedor_nickname: string
  nivel_reputacao: string
  totais: { anuncios: number; pedidos: number; envios: number }
  receita_total: number
  pedidos_por_status: Record<string, number>
  top_produtos: ProdutoResumoCanal[]
  pedidos_recentes: PedidoResumoCanal[]
}
