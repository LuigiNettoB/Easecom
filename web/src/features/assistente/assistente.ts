import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'

import { api } from '@/shared/api/client'
import type { ErroApi } from '@/shared/api/types'

export type PapelMensagem = 'USUARIO' | 'ASSISTENTE'

export interface MensagemAssistente {
  id: string
  papel: PapelMensagem
  conteudo: string
  criado_em: string
}

export interface ConversaResumo {
  id: string
  titulo: string
  criado_em: string
  atualizado_em: string
}

export interface ConversaDetalhe extends ConversaResumo {
  mensagens: MensagemAssistente[]
}

export interface LimiteDiario {
  limite: number
  usadas: number
  restantes: number
}

interface RespostaAssistente {
  conversa: ConversaResumo
  mensagem: MensagemAssistente
  limite_diario: LimiteDiario
}

interface ListaPaginada<T> {
  count: number
  results: T[]
}

const CHAVE_CONVERSAS = ['assistente', 'conversas'] as const
const CHAVE_LIMITE = ['assistente', 'limite'] as const

export function useLimiteDiario(habilitado: boolean) {
  return useQuery({
    queryKey: CHAVE_LIMITE,
    queryFn: async () => (await api.get<LimiteDiario>('/assistente/limite')).data,
    enabled: habilitado,
  })
}

export function useConversas(habilitado: boolean) {
  return useQuery({
    queryKey: CHAVE_CONVERSAS,
    queryFn: async () =>
      (await api.get<ListaPaginada<ConversaResumo>>('/assistente/conversas')).data.results,
    enabled: habilitado,
  })
}

export async function buscarConversa(id: string) {
  return (await api.get<ConversaDetalhe>(`/assistente/conversas/${id}`)).data
}

export function useEnviarMensagem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (dados: { mensagem: string; conversa_id?: string | null }) =>
      (await api.post<RespostaAssistente>('/assistente/mensagens', dados)).data,
    onSuccess: (resposta) => {
      queryClient.setQueryData(CHAVE_LIMITE, resposta.limite_diario)
      void queryClient.invalidateQueries({ queryKey: CHAVE_CONVERSAS })
    },
  })
}

export function useExcluirConversa() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/assistente/conversas/${id}`)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CHAVE_CONVERSAS })
    },
  })
}

export function mensagemDeErro(erro: unknown, padrao: string) {
  if (axios.isAxiosError<ErroApi>(erro)) {
    if (!erro.response) return 'Sem conexão com o servidor. Verifique se o backend está rodando.'
    return erro.response.data?.mensagem ?? padrao
  }
  return padrao
}
