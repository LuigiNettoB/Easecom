import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import {
  ArrowLeftIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PaperAirplaneIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

import { cn } from '@/shared/lib/cn'

import {
  buscarConversa,
  mensagemDeErro,
  useConversas,
  useEnviarMensagem,
  useExcluirConversa,
  useLimiteDiario,
  type MensagemAssistente,
} from './assistente'
import { TextoFormatado } from './TextoFormatado'

const SUGESTOES = [
  'Quanto vendi este mês?',
  'Quais foram meus produtos mais vendidos?',
  'Qual canal vende mais?',
  'Compare minhas vendas deste mês com o mês passado.',
  'Quais produtos estão com estoque baixo?',
]

type Tela = 'chat' | 'historico'

export function AssistenteChat() {
  const [aberto, setAberto] = useState(false)
  const [tela, setTela] = useState<Tela>('chat')
  const [conversaId, setConversaId] = useState<string | null>(null)
  const [mensagens, setMensagens] = useState<MensagemAssistente[]>([])
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [carregandoConversa, setCarregandoConversa] = useState(false)

  const enviar = useEnviarMensagem()
  const excluir = useExcluirConversa()
  const limite = useLimiteDiario(aberto)
  const conversas = useConversas(aberto && tela === 'historico')

  const fimDaLista = useRef<HTMLDivElement>(null)
  const campo = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fimDaLista.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, enviar.isPending])

  useEffect(() => {
    if (aberto && tela === 'chat') campo.current?.focus()
  }, [aberto, tela])

  useEffect(() => {
    if (!aberto) return
    const fecharComEsc = (evento: globalThis.KeyboardEvent) => {
      if (evento.key === 'Escape') setAberto(false)
    }
    window.addEventListener('keydown', fecharComEsc)
    return () => window.removeEventListener('keydown', fecharComEsc)
  }, [aberto])

  const semPerguntas = limite.data?.restantes === 0

  function perguntar(pergunta: string) {
    const conteudo = pergunta.trim()
    if (!conteudo || enviar.isPending || semPerguntas) return

    const provisoria: MensagemAssistente = {
      id: `provisoria-${Date.now()}`,
      papel: 'USUARIO',
      conteudo,
      criado_em: new Date().toISOString(),
    }
    setMensagens((atuais) => [...atuais, provisoria])
    setTexto('')
    setErro(null)

    enviar.mutate(
      { mensagem: conteudo, conversa_id: conversaId },
      {
        onSuccess: (resposta) => {
          setConversaId(resposta.conversa.id)
          setMensagens((atuais) => [...atuais, resposta.mensagem])
        },
        onError: (falha) => {
          // devolve a pergunta ao campo para a pessoa tentar de novo sem redigitar
          setMensagens((atuais) => atuais.filter((m) => m.id !== provisoria.id))
          setTexto(conteudo)
          setErro(mensagemDeErro(falha, 'O assistente não conseguiu responder agora.'))
        },
      },
    )
  }

  function aoEnviar(evento: FormEvent) {
    evento.preventDefault()
    perguntar(texto)
  }

  function aoDigitar(evento: KeyboardEvent<HTMLTextAreaElement>) {
    if (evento.key === 'Enter' && !evento.shiftKey) {
      evento.preventDefault()
      perguntar(texto)
    }
  }

  function novaConversa() {
    setConversaId(null)
    setMensagens([])
    setErro(null)
    setTela('chat')
  }

  async function abrirConversa(id: string) {
    setCarregandoConversa(true)
    setErro(null)
    setTela('chat')
    try {
      const conversa = await buscarConversa(id)
      setConversaId(conversa.id)
      setMensagens(conversa.mensagens)
    } catch (falha) {
      setErro(mensagemDeErro(falha, 'Não foi possível abrir a conversa.'))
    } finally {
      setCarregandoConversa(false)
    }
  }

  function excluirConversa(id: string) {
    excluir.mutate(id, {
      onSuccess: () => {
        if (id === conversaId) novaConversa()
      },
    })
  }

  return (
    <>
      {aberto && (
        <section
          aria-label="Assistente de vendas"
          className="fixed bottom-24 right-4 z-50 flex h-[min(620px,calc(100vh-8rem))] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border bg-white shadow-2xl sm:right-6"
          role="dialog"
        >
          <header className="flex items-center gap-2 bg-[#00305c] px-4 py-3 text-white">
            {tela === 'historico' ? (
              <button
                aria-label="Voltar para a conversa"
                className="rounded-md p-1 hover:bg-white/10"
                onClick={() => setTela('chat')}
                type="button"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
            ) : (
              <SparklesIcon className="h-5 w-5 text-[#85FA51]" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {tela === 'historico' ? 'Conversas anteriores' : 'Assistente de vendas'}
              </p>
              {tela === 'chat' && (
                <p className="truncate text-xs text-white/70">
                  Pergunte sobre vendas, pedidos, estoque e financeiro
                </p>
              )}
            </div>
            {tela === 'chat' && (
              <button
                aria-label="Conversas anteriores"
                className="rounded-md p-1 hover:bg-white/10"
                onClick={() => setTela('historico')}
                title="Conversas anteriores"
                type="button"
              >
                <ClockIcon className="h-5 w-5" />
              </button>
            )}
            <button
              aria-label="Nova conversa"
              className="rounded-md p-1 hover:bg-white/10"
              onClick={novaConversa}
              title="Nova conversa"
              type="button"
            >
              <PlusIcon className="h-5 w-5" />
            </button>
            <button
              aria-label="Fechar assistente"
              className="rounded-md p-1 hover:bg-white/10"
              onClick={() => setAberto(false)}
              title="Fechar"
              type="button"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </header>

          {tela === 'historico' ? (
            <div className="flex-1 overflow-y-auto p-3">
              {conversas.isPending && (
                <p className="p-3 text-sm text-muted-foreground">Carregando conversas...</p>
              )}
              {conversas.isError && (
                <p className="p-3 text-sm text-red-700">
                  {mensagemDeErro(conversas.error, 'Não foi possível carregar as conversas.')}
                </p>
              )}
              {conversas.data?.length === 0 && (
                <p className="p-3 text-sm text-muted-foreground">
                  Nenhuma conversa ainda. Faça sua primeira pergunta!
                </p>
              )}
              <ul className="space-y-1">
                {conversas.data?.map((conversa) => (
                  <li
                    key={conversa.id}
                    className={cn(
                      'group flex items-center gap-2 rounded-md px-3 py-2 hover:bg-muted',
                      conversa.id === conversaId && 'bg-muted',
                    )}
                  >
                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() => void abrirConversa(conversa.id)}
                      type="button"
                    >
                      <p className="truncate text-sm font-medium">{conversa.titulo}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(conversa.atualizado_em).toLocaleString('pt-BR', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </p>
                    </button>
                    <button
                      aria-label={`Excluir conversa ${conversa.titulo}`}
                      className="rounded-md p-1 text-muted-foreground hover:bg-red-50 hover:text-red-700"
                      disabled={excluir.isPending}
                      onClick={() => excluirConversa(conversa.id)}
                      title="Excluir conversa"
                      type="button"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              <div aria-live="polite" className="flex-1 space-y-3 overflow-y-auto p-4">
                {carregandoConversa && (
                  <p className="text-sm text-muted-foreground">Carregando conversa...</p>
                )}

                {!carregandoConversa && mensagens.length === 0 && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Olá! Posso consultar os dados da sua loja e responder em segundos.
                      Experimente:
                    </p>
                    <div className="flex flex-col items-start gap-2">
                      {SUGESTOES.map((sugestao) => (
                        <button
                          key={sugestao}
                          className="rounded-full border border-[#00305c]/20 px-3 py-1.5 text-left text-sm text-[#00305c] hover:bg-[#00305c]/5 disabled:opacity-50"
                          disabled={enviar.isPending || semPerguntas}
                          onClick={() => perguntar(sugestao)}
                          type="button"
                        >
                          {sugestao}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {mensagens.map((mensagem) =>
                  mensagem.papel === 'USUARIO' ? (
                    <div key={mensagem.id} className="flex justify-end">
                      <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-[#00305c] px-3 py-2 text-sm text-white">
                        {mensagem.conteudo}
                      </p>
                    </div>
                  ) : (
                    <div key={mensagem.id} className="flex justify-start">
                      <div className="max-w-[90%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm">
                        <TextoFormatado texto={mensagem.conteudo} />
                      </div>
                    </div>
                  ),
                )}

                {enviar.isPending && (
                  <div className="flex justify-start">
                    <p className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-muted-foreground">
                      <span className="flex gap-1" aria-hidden>
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
                      </span>
                      Consultando seus dados...
                    </p>
                  </div>
                )}

                {erro && (
                  <p className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
                    <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                    {erro}
                  </p>
                )}
                <div ref={fimDaLista} />
              </div>

              <form className="border-t border-border p-3" onSubmit={aoEnviar}>
                <div className="flex items-end gap-2">
                  <textarea
                    ref={campo}
                    aria-label="Sua pergunta"
                    className="max-h-32 min-h-[40px] flex-1 resize-none rounded-md border border-border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00305c]/40 disabled:opacity-60"
                    disabled={semPerguntas}
                    maxLength={2000}
                    onChange={(evento) => setTexto(evento.target.value)}
                    onKeyDown={aoDigitar}
                    placeholder={
                      semPerguntas ? 'Limite de hoje atingido' : 'Pergunte sobre suas vendas...'
                    }
                    rows={1}
                    value={texto}
                  />
                  <button
                    aria-label="Enviar pergunta"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#00305c] text-white hover:opacity-90 disabled:opacity-40"
                    disabled={!texto.trim() || enviar.isPending || semPerguntas}
                    type="submit"
                  >
                    <PaperAirplaneIcon className="h-5 w-5" />
                  </button>
                </div>
                {limite.data && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {semPerguntas
                      ? 'A loja usou todas as perguntas de hoje. O assistente volta amanhã.'
                      : `${limite.data.restantes} de ${limite.data.limite} perguntas restantes hoje`}
                  </p>
                )}
              </form>
            </>
          )}
        </section>
      )}

      <button
        aria-expanded={aberto}
        aria-label={aberto ? 'Fechar assistente de vendas' : 'Abrir assistente de vendas'}
        className="fixed bottom-6 right-4 z-50 flex h-14 items-center gap-2 rounded-full bg-[#00305c] px-4 text-sm font-medium text-white shadow-lg transition hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#85FA51]/60 sm:right-6"
        onClick={() => setAberto((atual) => !atual)}
        title="Assistente de vendas"
        type="button"
      >
        {aberto ? (
          <XMarkIcon className="h-6 w-6" />
        ) : (
          <ChatBubbleLeftRightIcon className="h-6 w-6 text-[#85FA51]" />
        )}
        <span className="hidden sm:inline">{aberto ? 'Fechar' : 'Assistente'}</span>
      </button>
    </>
  )
}
