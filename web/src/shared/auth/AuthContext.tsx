import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

import { api } from '@/shared/api/client'
import { armazenamentoTokens } from '@/shared/auth/storage'
import type { LoginEntrada, TokensAutenticacao, Usuario } from '@/shared/api/types'

interface AuthContextValor {
  usuario: Usuario | null
  carregando: boolean
  autenticado: boolean
  entrar: (dados: LoginEntrada) => Promise<void>
  sair: () => void
}

const AuthContext = createContext<AuthContextValor | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregarUsuarioAtual() {
      if (!armazenamentoTokens.obterAccess()) {
        setCarregando(false)
        return
      }
      try {
        const { data } = await api.get<Usuario>('/eu')
        setUsuario(data)
      } catch {
        armazenamentoTokens.limpar()
      } finally {
        setCarregando(false)
      }
    }
    void carregarUsuarioAtual()
  }, [])

  async function entrar(dados: LoginEntrada) {
    const { data: tokens } = await api.post<TokensAutenticacao>('/auth/login', dados)
    armazenamentoTokens.salvar(tokens.access, tokens.refresh)

    const { data: usuarioAtual } = await api.get<Usuario>('/eu')
    setUsuario(usuarioAtual)
  }

  function sair() {
    armazenamentoTokens.limpar()
    setUsuario(null)
  }

  return (
    <AuthContext.Provider
      value={{ usuario, carregando, autenticado: usuario !== null, entrar, sair }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const contexto = useContext(AuthContext)
  if (!contexto) {
    throw new Error('useAuth precisa ser usado dentro de <AuthProvider>')
  }
  return contexto
}
