const CHAVE_ACCESS = 'hub.access'
const CHAVE_REFRESH = 'hub.refresh'

export const armazenamentoTokens = {
  obterAccess: () => localStorage.getItem(CHAVE_ACCESS),
  obterRefresh: () => localStorage.getItem(CHAVE_REFRESH),
  salvar: (access: string, refresh: string) => {
    localStorage.setItem(CHAVE_ACCESS, access)
    localStorage.setItem(CHAVE_REFRESH, refresh)
  },
  limpar: () => {
    localStorage.removeItem(CHAVE_ACCESS)
    localStorage.removeItem(CHAVE_REFRESH)
  },
}
