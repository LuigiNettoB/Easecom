import { zodResolver } from '@hookform/resolvers/zod'
import { useRef, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import {
  ArrowRightOnRectangleIcon,
  BellIcon,
  BuildingStorefrontIcon,
  CameraIcon,
  CheckCircleIcon,
  ComputerDesktopIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  LinkIcon,
  LockClosedIcon,
  PhotoIcon,
  ShieldCheckIcon,
  TrashIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'

import { trocarSenhaSchema, type TrocarSenhaFormValores } from '@/features/configuracoes/schemas'
import { CATEGORIAS, useNotificacoes, type Categoria } from '@/features/notificacoes/dados'
import { ICONES } from '@/features/notificacoes/icones'
import { api } from '@/shared/api/client'
import type { ErroApi, Usuario } from '@/shared/api/types'
import { useAuth } from '@/shared/auth/AuthContext'
import { armazenamentoTokens } from '@/shared/auth/storage'
import { cn } from '@/shared/lib/cn'
import {
  definirIncluirDemonstracao,
  limparPreferenciasLocais,
  useIncluirDemonstracao,
} from '@/shared/preferencias'
import { Avatar } from '@/shared/ui/Avatar'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { Input } from '@/shared/ui/Input'
import { Label } from '@/shared/ui/Label'

const SECOES = [
  { id: 'perfil', rotulo: 'Perfil', descricao: 'Fotos e dados da conta', icone: UserCircleIcon },
  { id: 'seguranca', rotulo: 'Segurança', descricao: 'Senha e sessão', icone: ShieldCheckIcon },
  {
    id: 'loja',
    rotulo: 'Loja e metas',
    descricao: 'Meta mensal e dados de demonstração',
    icone: BuildingStorefrontIcon,
  },
  {
    id: 'notificacoes',
    rotulo: 'Notificações',
    descricao: 'O que você quer acompanhar',
    icone: BellIcon,
  },
  {
    id: 'integracoes',
    rotulo: 'Integrações',
    descricao: 'Marketplaces e serviços',
    icone: LinkIcon,
  },
  {
    id: 'dados',
    rotulo: 'Dados do navegador',
    descricao: 'Preferências salvas aqui',
    icone: ComputerDesktopIcon,
  },
] as const
type IdSecao = (typeof SECOES)[number]['id']

const ROTULOS_PERFIL: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  OPERADOR: 'Operador',
  FINANCEIRO: 'Financeiro',
}

const CHAVE_META = 'easecom.meta-mensal'
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const dataLonga = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})
const dataHora = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

function Bloco({
  titulo,
  descricao,
  children,
  acento,
}: {
  titulo: string
  descricao?: string
  children: ReactNode
  acento?: boolean
}) {
  return (
    <Card className="overflow-hidden">
      <div
        className={cn(
          'border-b border-border px-6 py-4',
          acento && 'border-l-4 border-l-[#85FA51]',
        )}
      >
        <h2 className="text-base font-semibold text-[#00305c]">{titulo}</h2>
        {descricao && <p className="mt-0.5 text-sm text-muted-foreground">{descricao}</p>}
      </div>
      <div className="p-6">{children}</div>
    </Card>
  )
}

function Interruptor({
  ligado,
  onAlternar,
  rotulo,
}: {
  ligado: boolean
  onAlternar: () => void
  rotulo: string
}) {
  return (
    <button
      aria-checked={ligado}
      aria-label={rotulo}
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA] focus-visible:ring-offset-2',
        ligado ? 'bg-[#005DAA]' : 'bg-muted-foreground/30',
      )}
      onClick={onAlternar}
      role="switch"
      type="button"
    >
      <span
        className={cn(
          'absolute left-0 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
          ligado ? 'translate-x-[18px]' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}

function decodificarJwt(token: string | null): { exp?: number; iat?: number } | null {
  if (!token) return null
  try {
    const carga = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(carga))
  } catch {
    return null
  }
}

function forcaDaSenha(senha: string) {
  if (!senha) return null
  const criterios = [
    senha.length >= 8,
    senha.length >= 12,
    /[a-z]/.test(senha) && /[A-Z]/.test(senha),
    /\d/.test(senha),
    /[^A-Za-z0-9]/.test(senha),
  ]
  const pontos = criterios.filter(Boolean).length
  if (pontos <= 2) return { nivel: 1, rotulo: 'Fraca', cor: 'bg-red-500', texto: 'text-red-700' }
  if (pontos <= 3)
    return { nivel: 2, rotulo: 'Razoável', cor: 'bg-amber-400', texto: 'text-amber-800' }
  if (pontos <= 4) return { nivel: 3, rotulo: 'Boa', cor: 'bg-[#005DAA]', texto: 'text-[#005DAA]' }
  return { nivel: 4, rotulo: 'Forte', cor: 'bg-[#85FA51]', texto: 'text-[#1f5c0a]' }
}

function lerMeta() {
  try {
    return Number(localStorage.getItem(CHAVE_META)) || null
  } catch {
    return null
  }
}

// --- Seções ---------------------------------------------------------------------------------------

function SecaoPerfil() {
  const { usuario, atualizarUsuario } = useAuth()
  const [erroFoto, setErroFoto] = useState<string | null>(null)
  const [enviando, setEnviando] = useState<'foto-perfil' | 'banner' | null>(null)
  const inputPerfil = useRef<HTMLInputElement>(null)
  const inputBanner = useRef<HTMLInputElement>(null)

  async function enviarFoto(campo: 'foto-perfil' | 'banner', arquivo: File) {
    setErroFoto(null)
    if (arquivo.size > 5 * 1024 * 1024) {
      setErroFoto('A imagem precisa ter no máximo 5 MB.')
      return
    }
    setEnviando(campo)
    try {
      const formData = new FormData()
      formData.append('arquivo', arquivo)
      const { data } = await api.put<Usuario>(`/eu/${campo}`, formData)
      atualizarUsuario(data)
    } catch (erroRequisicao) {
      setErroFoto(
        axios.isAxiosError<ErroApi>(erroRequisicao)
          ? (erroRequisicao.response?.data.mensagem ?? 'Não foi possível enviar a imagem.')
          : 'Não foi possível enviar a imagem.',
      )
    } finally {
      setEnviando(null)
    }
  }

  const aoEscolher =
    (campo: 'foto-perfil' | 'banner') => (evento: React.ChangeEvent<HTMLInputElement>) => {
      const arquivo = evento.target.files?.[0]
      if (arquivo) void enviarFoto(campo, arquivo)
      evento.target.value = ''
    }

  return (
    <div className="flex flex-col gap-6">
      <Card className="overflow-hidden">
        <button
          aria-label="Alterar banner"
          className="group relative block h-40 w-full overflow-hidden bg-gradient-to-r from-[#005DAA] to-[#00305c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#85FA51]"
          onClick={() => inputBanner.current?.click()}
          type="button"
        >
          {usuario?.foto_banner_url && (
            <img alt="" className="h-full w-full object-cover" src={usuario.foto_banner_url} />
          )}
          <span className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 text-sm font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <PhotoIcon className="h-5 w-5" />
            {enviando === 'banner' ? 'Enviando...' : 'Alterar banner'}
          </span>
          {!usuario?.foto_banner_url && (
            <span className="absolute bottom-3 right-3 rounded-full bg-white/15 px-3 py-1 text-xs text-white/90">
              Adicione um banner da sua loja
            </span>
          )}
        </button>
        <input
          accept="image/*"
          className="hidden"
          onChange={aoEscolher('banner')}
          ref={inputBanner}
          type="file"
        />

        <div className="flex flex-col gap-4 px-6 pb-6 sm:flex-row sm:items-end">
          <button
            aria-label="Alterar foto de perfil"
            className="group relative -mt-12 shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA] focus-visible:ring-offset-2"
            onClick={() => inputPerfil.current?.click()}
            type="button"
          >
            <Avatar
              className="h-24 w-24 border-4 border-background text-2xl shadow-md"
              nome={usuario?.nome}
              src={usuario?.foto_perfil_url}
            />
            <span className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#005DAA] text-white shadow ring-2 ring-background">
              <CameraIcon className="h-4 w-4" />
            </span>
            {enviando === 'foto-perfil' && (
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-[11px] font-medium text-white">
                Enviando...
              </span>
            )}
          </button>
          <input
            accept="image/*"
            className="hidden"
            onChange={aoEscolher('foto-perfil')}
            ref={inputPerfil}
            type="file"
          />
          <div className="sm:pb-1 sm:pt-4">
            <p className="text-xl font-semibold text-[#00305c]">{usuario?.nome}</p>
            <p className="text-sm text-muted-foreground">
              {ROTULOS_PERFIL[usuario?.perfil ?? ''] ?? usuario?.perfil} · {usuario?.vendedor.nome}
            </p>
          </div>
        </div>
        {erroFoto && (
          <p className="mx-6 mb-6 flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
            <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
            {erroFoto}
          </p>
        )}
      </Card>

      <Bloco
        descricao="Os dados de cadastro ainda não podem ser editados por aqui."
        titulo="Dados da conta"
      >
        <dl className="grid gap-4 sm:grid-cols-2">
          {[
            ['Nome', usuario?.nome],
            ['E-mail', usuario?.email],
            ['Perfil de acesso', ROTULOS_PERFIL[usuario?.perfil ?? ''] ?? usuario?.perfil],
            ['Loja (vendedor)', usuario?.vendedor.nome],
            [
              'Membro desde',
              usuario?.criado_em ? dataLonga.format(new Date(usuario.criado_em)) : '—',
            ],
            ['ID da conta', usuario?.id],
          ].map(([rotulo, valor]) => (
            <div className="rounded-lg bg-muted/50 px-4 py-3" key={rotulo}>
              <dt className="text-xs text-muted-foreground">{rotulo}</dt>
              <dd
                className={cn(
                  'mt-0.5 truncate text-sm font-medium text-[#00305c]',
                  rotulo === 'ID da conta' && 'font-mono text-xs',
                )}
              >
                {valor}
              </dd>
            </div>
          ))}
        </dl>
      </Bloco>
    </div>
  )
}

function CampoSenha({
  id,
  rotulo,
  autoComplete,
  erro,
  registro,
}: {
  id: string
  rotulo: string
  autoComplete: string
  erro?: string
  registro: ReturnType<ReturnType<typeof useForm<TrocarSenhaFormValores>>['register']>
}) {
  const [visivel, setVisivel] = useState(false)
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{rotulo}</Label>
      <div className="relative">
        <Input
          autoComplete={autoComplete}
          className="pr-10 focus-visible:ring-[#005DAA]"
          id={id}
          type={visivel ? 'text' : 'password'}
          {...registro}
        />
        <button
          aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => setVisivel((v) => !v)}
          type="button"
        >
          {visivel ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
        </button>
      </div>
      {erro && <p className="text-sm text-destructive">{erro}</p>}
    </div>
  )
}

function SecaoSeguranca() {
  const { sair } = useAuth()
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TrocarSenhaFormValores>({ resolver: zodResolver(trocarSenhaSchema) })
  const forca = forcaDaSenha(watch('senha_nova') ?? '')

  async function aoSubmeter(valores: TrocarSenhaFormValores) {
    setErro(null)
    setSucesso(false)
    try {
      await api.post('/eu/senha', {
        senha_atual: valores.senha_atual,
        senha_nova: valores.senha_nova,
      })
      setSucesso(true)
      reset()
    } catch (erroRequisicao) {
      setErro(
        axios.isAxiosError<ErroApi>(erroRequisicao)
          ? (erroRequisicao.response?.data.mensagem ?? 'Não foi possível trocar a senha.')
          : 'Não foi possível trocar a senha.',
      )
    }
  }

  const sessao = decodificarJwt(armazenamentoTokens.obterRefresh())
  const inicioSessao = sessao?.iat ? new Date(sessao.iat * 1000) : null
  const fimSessao = sessao?.exp ? new Date(sessao.exp * 1000) : null
  const diasRestantes = fimSessao
    ? Math.max(Math.ceil((fimSessao.getTime() - Date.now()) / 86_400_000), 0)
    : null

  return (
    <div className="flex flex-col gap-6">
      <Bloco
        acento
        descricao="Use ao menos 8 caracteres. Misture letras maiúsculas, números e símbolos."
        titulo="Trocar senha"
      >
        <form
          className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_1fr]"
          noValidate
          onSubmit={handleSubmit(aoSubmeter)}
        >
          <div className="flex flex-col gap-4">
            <CampoSenha
              autoComplete="current-password"
              erro={errors.senha_atual?.message}
              id="senha_atual"
              registro={register('senha_atual')}
              rotulo="Senha atual"
            />
            <CampoSenha
              autoComplete="new-password"
              erro={errors.senha_nova?.message}
              id="senha_nova"
              registro={register('senha_nova')}
              rotulo="Nova senha"
            />
            {forca && (
              <div aria-live="polite">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((n) => (
                    <span
                      className={cn(
                        'h-1.5 flex-1 rounded-full',
                        n <= forca.nivel ? forca.cor : 'bg-muted',
                      )}
                      key={n}
                    />
                  ))}
                </div>
                <p className={cn('mt-1 text-xs font-medium', forca.texto)}>
                  Força da senha: {forca.rotulo}
                </p>
              </div>
            )}
            <CampoSenha
              autoComplete="new-password"
              erro={errors.confirmar_senha_nova?.message}
              id="confirmar_senha_nova"
              registro={register('confirmar_senha_nova')}
              rotulo="Confirmar nova senha"
            />
            {erro && <p className="text-sm text-destructive">{erro}</p>}
            {sucesso && (
              <p className="flex items-center gap-2 text-sm font-medium text-[#1f5c0a]">
                <CheckCircleIcon className="h-5 w-5" /> Senha alterada com sucesso.
              </p>
            )}
            <Button
              className="self-start bg-[#005DAA] text-white hover:bg-[#00497f]"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar nova senha'}
            </Button>
          </div>
          <ul className="flex flex-col gap-3 self-start rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <LockClosedIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#005DAA]" /> Não reutilize a
              senha de outros sites, principalmente a do e-mail ou dos marketplaces.
            </li>
            <li className="flex gap-2">
              <LockClosedIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#005DAA]" /> Frases longas
              são mais fortes e fáceis de lembrar que senhas curtas cheias de símbolos.
            </li>
            <li className="flex gap-2">
              <LockClosedIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#005DAA]" /> Prefira um
              gerenciador de senhas.
            </li>
          </ul>
        </form>
      </Bloco>

      <Bloco
        descricao="Seu acesso é renovado automaticamente enquanto você usa o sistema."
        titulo="Sessão neste navegador"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#85FA51]/25 text-[#1f5c0a]">
              <ComputerDesktopIcon className="h-5 w-5" />
            </span>
            <div className="text-sm">
              <p className="font-medium text-[#00305c]">Sessão ativa</p>
              <p className="text-muted-foreground">
                {inicioSessao
                  ? `Renovada em ${dataHora.format(inicioSessao)}`
                  : 'Início desconhecido'}
                {diasRestantes !== null &&
                  ` · expira em ${diasRestantes} ${diasRestantes === 1 ? 'dia' : 'dias'} sem uso`}
              </p>
            </div>
          </div>
          <Button
            className="flex items-center gap-2"
            onClick={sair}
            type="button"
            variant="outline"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" /> Sair desta conta
          </Button>
        </div>
      </Bloco>
    </div>
  )
}

function SecaoLoja() {
  const incluirDemonstracao = useIncluirDemonstracao()
  const [meta, setMeta] = useState(() => String(lerMeta() ?? ''))
  const [salvo, setSalvo] = useState(false)

  function salvarMeta(evento: React.FormEvent) {
    evento.preventDefault()
    const valor = Number(meta.replace(/\./g, '').replace(',', '.'))
    try {
      if (valor > 0) localStorage.setItem(CHAVE_META, String(valor))
      else localStorage.removeItem(CHAVE_META)
    } catch {
      // sem armazenamento
    }
    setSalvo(true)
    setTimeout(() => setSalvo(false), 2000)
  }

  const valorMeta = Number(meta.replace(/\./g, '').replace(',', '.'))

  return (
    <div className="flex flex-col gap-6">
      <Bloco
        descricao="Usada no anel de progresso e na projeção da página Início."
        titulo="Meta de faturamento mensal"
      >
        <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={salvarMeta}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="meta">Meta (R$)</Label>
            <Input
              className="w-48 focus-visible:ring-[#005DAA]"
              id="meta"
              inputMode="decimal"
              onChange={(e) => setMeta(e.target.value)}
              placeholder="Automática"
              value={meta}
            />
          </div>
          <Button className="bg-[#005DAA] text-white hover:bg-[#00497f]" type="submit">
            Salvar meta
          </Button>
          {salvo && (
            <span className="flex items-center gap-1 text-sm font-medium text-[#1f5c0a]">
              <CheckCircleIcon className="h-4 w-4" /> Salvo
            </span>
          )}
        </form>
        <p className="mt-3 text-xs text-muted-foreground">
          {valorMeta > 0
            ? `Meta atual: ${moeda.format(valorMeta)} por mês.`
            : 'Deixe em branco para usar a sugestão automática: 10% acima do faturamento do mês anterior.'}
        </p>
      </Bloco>

      <Bloco
        descricao="Sua conta do Mercado Livre tem poucas vendas reais. O histórico de demonstração deixa os painéis com tendências para explorar."
        titulo="Dados de demonstração"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="text-sm">
            <p className="font-medium text-[#00305c]">
              Incluir histórico de demonstração nos painéis
            </p>
            <p className="mt-0.5 text-muted-foreground">
              Vale para Início, Pedidos, Financeiro, Notificações e sugestões de reposição.
              Desligado, você vê só as vendas reais.
            </p>
          </div>
          <Interruptor
            ligado={incluirDemonstracao}
            onAlternar={() => definirIncluirDemonstracao(!incluirDemonstracao)}
            rotulo="Incluir dados de demonstração"
          />
        </div>
      </Bloco>
    </div>
  )
}

function SecaoNotificacoes() {
  const n = useNotificacoes()
  return (
    <Bloco
      descricao="Categorias desligadas somem da página de notificações e do sino."
      titulo="Preferências de notificação"
    >
      <ul className="divide-y divide-border">
        {(Object.keys(CATEGORIAS) as Categoria[]).map((c) => {
          const Icone = ICONES[c]
          const total = n.todas.filter((item) => item.categoria === c).length
          return (
            <li
              className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              key={c}
            >
              <span className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#005DAA]/10 text-[#005DAA]">
                  <Icone className="h-4 w-4" />
                </span>
                <span className="text-sm">
                  <span className="block font-medium text-[#00305c]">{CATEGORIAS[c]}</span>
                  <span className="text-xs text-muted-foreground">
                    {total} notificações recentes
                  </span>
                </span>
              </span>
              <Interruptor
                ligado={!n.silenciada(c)}
                onAlternar={() => n.alternarCategoria(c)}
                rotulo={`Notificações de ${CATEGORIAS[c]}`}
              />
            </li>
          )
        })}
      </ul>
      <Link
        className="mt-4 inline-block text-sm font-medium text-[#005DAA] hover:underline"
        to="/notificacoes"
      >
        Abrir notificações →
      </Link>
    </Bloco>
  )
}

function SecaoIntegracoes() {
  const status = useQuery({
    queryKey: ['canais', 'mercado-livre', 'status'],
    queryFn: async () =>
      (await api.get<{ conectado: boolean }>('/canais/mercado-livre/status')).data,
  })
  const conectado = status.data?.conectado
  return (
    <div className="flex flex-col gap-6">
      <Bloco titulo="Marketplaces">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-24 items-center justify-center rounded-lg border border-border bg-[#FFE600] px-2">
              <img alt="Mercado Livre" className="max-h-7" src="/canais/mercadolivre.svg" />
            </span>
            <div className="text-sm">
              <p className="font-medium text-[#00305c]">Mercado Livre</p>
              <p
                className={cn(
                  'flex items-center gap-1.5',
                  conectado ? 'text-[#1f5c0a]' : 'text-red-700',
                )}
              >
                <span
                  className={cn('h-2 w-2 rounded-full', conectado ? 'bg-[#85FA51]' : 'bg-red-500')}
                />
                {status.isPending
                  ? 'Verificando...'
                  : conectado
                    ? 'Conectado — anúncios e pedidos sincronizados'
                    : 'Desconectado'}
              </p>
            </div>
          </div>
          <Link
            className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm font-medium hover:bg-muted"
            to="/canais"
          >
            Gerenciar canais
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Amazon, Shopee, Magalu e outros marketplaces estão a caminho — veja em Canais.
        </p>
      </Bloco>
      <Bloco
        descricao="Onde ficam as fotos de perfil e o banner."
        titulo="Armazenamento de imagens"
      >
        <p className="text-sm text-muted-foreground">
          As imagens são guardadas no Supabase Storage do projeto. Se o envio de fotos falhar,
          confira a chave
          <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">
            SUPABASE_SERVICE_ROLE_KEY
          </code>
          no <code className="rounded bg-muted px-1.5 py-0.5 text-xs">.env</code> do backend.
        </p>
      </Bloco>
    </div>
  )
}

function SecaoDados() {
  const [removidas, setRemovidas] = useState<number | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const salvas = [
    ['Meta mensal', 'easecom.meta-mensal'],
    ['Menu lateral recolhido', 'easecom.menu-recolhido'],
    ['Notificações lidas e silenciadas', 'easecom.notificacoes-lidas'],
    ['Lista de interesse de canais', 'easecom.canais-interesse'],
    ['Anotações de fornecedores', 'easecom.fornecedor-nota.'],
    ['Dados de demonstração', 'easecom.incluir-demonstracao'],
  ]
  return (
    <Bloco
      descricao="Estas preferências ficam só neste navegador — não vão para outros dispositivos."
      titulo="Dados salvos neste navegador"
    >
      <ul className="grid gap-2 sm:grid-cols-2">
        {salvas.map(([rotulo]) => (
          <li
            className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm text-foreground"
            key={rotulo}
          >
            <CheckCircleIcon className="h-4 w-4 text-[#005DAA]" /> {rotulo}
          </li>
        ))}
      </ul>
      <div className="mt-6 rounded-lg border border-red-200 bg-red-50/60 p-4">
        <p className="text-sm font-medium text-red-800">Limpar preferências locais</p>
        <p className="mt-0.5 text-xs text-red-800/80">
          Apaga meta, anotações, notificações lidas e as demais preferências acima. Você continua
          logado. Não dá para desfazer.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {confirmando ? (
            <>
              <Button
                className="flex items-center gap-2 bg-red-600 text-white hover:bg-red-700"
                onClick={() => {
                  setRemovidas(limparPreferenciasLocais())
                  setConfirmando(false)
                }}
                size="sm"
                type="button"
              >
                <TrashIcon className="h-4 w-4" /> Sim, apagar
              </Button>
              <Button
                onClick={() => setConfirmando(false)}
                size="sm"
                type="button"
                variant="outline"
              >
                Cancelar
              </Button>
            </>
          ) : (
            <Button
              className="flex items-center gap-2 border-red-300 text-red-800 hover:bg-red-100"
              onClick={() => setConfirmando(true)}
              size="sm"
              type="button"
              variant="outline"
            >
              <TrashIcon className="h-4 w-4" /> Limpar preferências
            </Button>
          )}
          {removidas !== null && (
            <span className="text-xs font-medium text-red-800">
              {removidas} {removidas === 1 ? 'item apagado' : 'itens apagados'}. Recarregue a página
              para aplicar em tudo.
            </span>
          )}
        </div>
      </div>
    </Bloco>
  )
}

// --- Página ---------------------------------------------------------------------------------------

export function ConfiguracoesPage() {
  const [params, setParams] = useSearchParams()
  const pedida = params.get('secao')
  const secao: IdSecao = SECOES.some((s) => s.id === pedida) ? (pedida as IdSecao) : 'perfil'
  const atual = SECOES.find((s) => s.id === secao)!

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#00305c]">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie seu perfil, a segurança da conta e as preferências do Easecom.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav aria-label="Seções das configurações" className="lg:sticky lg:top-6 lg:self-start">
          <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
            {SECOES.map(({ id, rotulo, descricao, icone: Icone }) => {
              const ativo = id === secao
              return (
                <li className="shrink-0" key={id}>
                  <button
                    aria-current={ativo ? 'page' : undefined}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA]',
                      ativo
                        ? 'bg-[#005DAA] text-white shadow-sm'
                        : 'text-foreground hover:bg-[#85FA51]/10',
                    )}
                    onClick={() => setParams({ secao: id }, { replace: true })}
                    type="button"
                  >
                    <Icone
                      className={cn(
                        'h-5 w-5 shrink-0',
                        ativo ? 'text-[#85FA51]' : 'text-[#005DAA]',
                      )}
                    />
                    <span>
                      <span className="block text-sm font-medium">{rotulo}</span>
                      <span
                        className={cn(
                          'hidden text-xs lg:block',
                          ativo ? 'text-white/75' : 'text-muted-foreground',
                        )}
                      >
                        {descricao}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <div aria-label={atual.rotulo} className="min-w-0" role="region">
          {secao === 'perfil' && <SecaoPerfil />}
          {secao === 'seguranca' && <SecaoSeguranca />}
          {secao === 'loja' && <SecaoLoja />}
          {secao === 'notificacoes' && <SecaoNotificacoes />}
          {secao === 'integracoes' && <SecaoIntegracoes />}
          {secao === 'dados' && <SecaoDados />}
        </div>
      </div>
    </section>
  )
}
