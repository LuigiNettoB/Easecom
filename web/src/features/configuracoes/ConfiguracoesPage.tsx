import { zodResolver } from '@hookform/resolvers/zod'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import axios from 'axios'

import { api } from '@/shared/api/client'
import { useAuth } from '@/shared/auth/AuthContext'
import { cn } from '@/shared/lib/cn'
import { Avatar } from '@/shared/ui/Avatar'
import { Button } from '@/shared/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/Card'
import { Input } from '@/shared/ui/Input'
import { Label } from '@/shared/ui/Label'
import { trocarSenhaSchema, type TrocarSenhaFormValores } from '@/features/configuracoes/schemas'
import type { ErroApi, Usuario } from '@/shared/api/types'

export function ConfiguracoesPage() {
  const { usuario, atualizarUsuario } = useAuth()
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)

  const [erroFoto, setErroFoto] = useState<string | null>(null)
  const [enviandoPerfil, setEnviandoPerfil] = useState(false)
  const [enviandoBanner, setEnviandoBanner] = useState(false)
  const inputPerfilRef = useRef<HTMLInputElement>(null)
  const inputBannerRef = useRef<HTMLInputElement>(null)

  async function enviarFoto(
    campo: 'foto-perfil' | 'banner',
    arquivo: File,
    definirEnviando: (enviando: boolean) => void,
  ) {
    setErroFoto(null)
    definirEnviando(true)
    try {
      const formData = new FormData()
      formData.append('arquivo', arquivo)
      const { data } = await api.put<Usuario>(`/eu/${campo}`, formData)
      atualizarUsuario(data)
    } catch (erroRequisicao) {
      if (axios.isAxiosError<ErroApi>(erroRequisicao)) {
        setErroFoto(erroRequisicao.response?.data.mensagem ?? 'Não foi possível enviar a imagem.')
      } else {
        setErroFoto('Não foi possível enviar a imagem.')
      }
    } finally {
      definirEnviando(false)
    }
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TrocarSenhaFormValores>({ resolver: zodResolver(trocarSenhaSchema) })

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
      if (axios.isAxiosError<ErroApi>(erroRequisicao)) {
        setErro(erroRequisicao.response?.data.mensagem ?? 'Não foi possível trocar a senha.')
      } else {
        setErro('Não foi possível trocar a senha.')
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Configurações</h1>

      <Card>
        <CardContent className="p-0">
          <button
            type="button"
            onClick={() => inputBannerRef.current?.click()}
            className="group relative flex h-32 w-full items-center justify-center overflow-hidden rounded-t-lg bg-muted"
          >
            {usuario?.foto_banner_url && (
              <img
                src={usuario.foto_banner_url}
                alt="Banner da conta"
                className="h-full w-full object-cover"
              />
            )}
            <span
              className={cn(
                'absolute inset-0 flex items-center justify-center bg-black/40 text-sm font-medium text-white opacity-0 transition-opacity group-hover:opacity-100',
                !usuario?.foto_banner_url && 'opacity-100 bg-black/0 text-muted-foreground',
              )}
            >
              {enviandoBanner ? 'Enviando...' : 'Clique para alterar o banner'}
            </span>
            <input
              ref={inputBannerRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(evento) => {
                const arquivo = evento.target.files?.[0]
                if (arquivo) void enviarFoto('banner', arquivo, setEnviandoBanner)
                evento.target.value = ''
              }}
            />
          </button>

          <div className="flex items-center gap-4 px-6 pb-6 pt-4">
            <button
              type="button"
              onClick={() => inputPerfilRef.current?.click()}
              className="group relative -mt-12 rounded-full"
            >
              <Avatar
                src={usuario?.foto_perfil_url}
                nome={usuario?.nome}
                className="h-20 w-20 border-4 border-background text-xl"
              />
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                {enviandoPerfil ? 'Enviando...' : 'Alterar'}
              </span>
              <input
                ref={inputPerfilRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(evento) => {
                  const arquivo = evento.target.files?.[0]
                  if (arquivo) void enviarFoto('foto-perfil', arquivo, setEnviandoPerfil)
                  evento.target.value = ''
                }}
              />
            </button>
            <div>
              <p className="text-sm font-medium">{usuario?.nome}</p>
              <p className="text-xs text-muted-foreground">
                Clique na foto ou no banner para alterar
              </p>
              {erroFoto && <p className="mt-1 text-sm text-destructive">{erroFoto}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dados da conta</CardTitle>
          <CardDescription>Informações do seu usuário e vendedor.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Nome</p>
            <p className="font-medium">{usuario?.nome}</p>
          </div>
          <div>
            <p className="text-muted-foreground">E-mail</p>
            <p className="font-medium">{usuario?.email}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Perfil</p>
            <p className="font-medium">{usuario?.perfil}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Vendedor</p>
            <p className="font-medium">{usuario?.vendedor.nome}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trocar senha</CardTitle>
          <CardDescription>Informe a senha atual e a nova senha.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex max-w-sm flex-col gap-4"
            onSubmit={handleSubmit(aoSubmeter)}
            noValidate
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="senha_atual">Senha atual</Label>
              <Input
                id="senha_atual"
                type="password"
                autoComplete="current-password"
                {...register('senha_atual')}
              />
              {errors.senha_atual && (
                <p className="text-sm text-destructive">{errors.senha_atual.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="senha_nova">Nova senha</Label>
              <Input
                id="senha_nova"
                type="password"
                autoComplete="new-password"
                {...register('senha_nova')}
              />
              {errors.senha_nova && (
                <p className="text-sm text-destructive">{errors.senha_nova.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirmar_senha_nova">Confirmar nova senha</Label>
              <Input
                id="confirmar_senha_nova"
                type="password"
                autoComplete="new-password"
                {...register('confirmar_senha_nova')}
              />
              {errors.confirmar_senha_nova && (
                <p className="text-sm text-destructive">{errors.confirmar_senha_nova.message}</p>
              )}
            </div>
            {erro && <p className="text-sm text-destructive">{erro}</p>}
            {sucesso && <p className="text-sm text-primary">Senha alterada com sucesso.</p>}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar nova senha'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
