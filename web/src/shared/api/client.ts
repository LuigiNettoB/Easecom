import axios from 'axios'

import { armazenamentoTokens } from '@/shared/auth/storage'
import type { TokensAutenticacao } from '@/shared/api/types'

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'

export const api = axios.create({ baseURL })

api.interceptors.request.use((config) => {
  const access = armazenamentoTokens.obterAccess()
  if (access) {
    config.headers.Authorization = `Bearer ${access}`
  }
  return config
})

let renovacaoEmAndamento: Promise<string | null> | null = null

async function renovarAccessToken(): Promise<string | null> {
  const refresh = armazenamentoTokens.obterRefresh()
  if (!refresh) return null

  try {
    const { data } = await axios.post<TokensAutenticacao>(`${baseURL}/auth/refresh`, { refresh })
    armazenamentoTokens.salvar(data.access, data.refresh ?? refresh)
    return data.access
  } catch {
    return null
  }
}

api.interceptors.response.use(
  (resposta) => resposta,
  async (erro) => {
    const requisicaoOriginal = erro.config
    const eraRequisicaoDeAuth = requisicaoOriginal?.url?.includes('/auth/')

    if (erro.response?.status === 401 && !requisicaoOriginal._retentativa && !eraRequisicaoDeAuth) {
      requisicaoOriginal._retentativa = true

      renovacaoEmAndamento ??= renovarAccessToken()
      const novoAccess = await renovacaoEmAndamento
      renovacaoEmAndamento = null

      if (novoAccess) {
        requisicaoOriginal.headers.Authorization = `Bearer ${novoAccess}`
        return api(requisicaoOriginal)
      }

      armazenamentoTokens.limpar()
      window.location.href = '/login'
    }

    return Promise.reject(erro)
  },
)
