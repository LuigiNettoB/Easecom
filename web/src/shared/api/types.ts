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
