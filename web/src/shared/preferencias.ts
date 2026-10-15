import { useSyncExternalStore } from 'react'

// Preferências deste navegador. São conveniências: se o armazenamento falhar,
// tudo volta ao padrão sem quebrar a tela.

const CHAVE_DEMO = 'easecom.incluir-demonstracao'
const ouvintes = new Set<() => void>()

function lerDemo() {
  try {
    return localStorage.getItem(CHAVE_DEMO) !== '0'
  } catch {
    return true
  }
}

let incluirDemonstracao = lerDemo()

export function definirIncluirDemonstracao(valor: boolean) {
  incluirDemonstracao = valor
  try {
    localStorage.setItem(CHAVE_DEMO, valor ? '1' : '0')
  } catch {
    // vale até recarregar
  }
  ouvintes.forEach((ouvinte) => ouvinte())
}

// padrão do app para incluir o histórico de demonstração nos painéis
export function useIncluirDemonstracao() {
  return useSyncExternalStore(
    (ouvinte) => {
      ouvintes.add(ouvinte)
      return () => ouvintes.delete(ouvinte)
    },
    () => incluirDemonstracao,
  )
}

// apaga todas as preferências locais do Easecom (não mexe na sessão de login)
export function limparPreferenciasLocais() {
  try {
    const chaves = Object.keys(localStorage).filter((chave) => chave.startsWith('easecom.'))
    chaves.forEach((chave) => localStorage.removeItem(chave))
    return chaves.length
  } catch {
    return 0
  }
}
