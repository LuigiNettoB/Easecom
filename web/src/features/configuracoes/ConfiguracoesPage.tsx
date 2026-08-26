import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import axios from 'axios'

import { api } from '@/shared/api/client'
import { useAuth } from '@/shared/auth/AuthContext'
import { Button } from '@/shared/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/Card'
import { Input } from '@/shared/ui/Input'
import { Label } from '@/shared/ui/Label'
import { trocarSenhaSchema, type TrocarSenhaFormValores } from '@/features/configuracoes/schemas'
import type { ErroApi } from '@/shared/api/types'

export function ConfiguracoesPage() {
  const { usuario } = useAuth()
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)

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
