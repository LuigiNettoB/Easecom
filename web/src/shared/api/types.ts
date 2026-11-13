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

export interface AnuncioMercadoLivre {
  id: string
  titulo: string
  sku: string
  categoria: string
  preco: number
  moeda: string
  estoque: number
  vendidos: number
  status: string
  foto: string
  link: string
}

export interface AtributoAnuncio {
  nome: string
  valor: string
}

export interface AnuncioMercadoLivreDetalhe extends AnuncioMercadoLivre {
  fotos: string[]
  descricao: string
  condicao: string
  garantia: string
  frete_gratis: boolean
  criado_em: string | null
  atributos: AtributoAnuncio[]
}

export interface ItemPedidoMercadoLivre {
  anuncio_id: string
  titulo: string
  categoria: string
  quantidade: number
  preco_unitario: number
  tarifa: number
}

export interface PedidoMercadoLivre {
  id: string
  data: string
  status: string
  total: number
  comprador: string
  forma_pagamento: string
  parcelas: number
  itens: ItemPedidoMercadoLivre[]
}
