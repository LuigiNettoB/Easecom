import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

import { api } from '@/shared/api/client'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Input'
import { Label } from '@/shared/ui/Label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/Card'
import { cadastroSchema, type CadastroFormValores } from '@/features/auth/schemas'
import type { ErroApi } from '@/shared/api/types'

export function CadastroPage() {
  const navigate = useNavigate()
  const [erro, setErro] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CadastroFormValores>({ resolver: zodResolver(cadastroSchema) })

  async function aoSubmeter(valores: CadastroFormValores) {
    setErro(null)
    try {
      await api.post('/auth/cadastro', valores)
      navigate('/login', { replace: true })
    } catch (erroRequisicao) {
      if (axios.isAxiosError<ErroApi>(erroRequisicao)) {
        setErro(erroRequisicao.response?.data.mensagem ?? 'Não foi possível cadastrar.')
      } else {
        setErro('Não foi possível cadastrar.')
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm">
        <img
            src="../public/logo.png"
            alt="Logo Easecom"
            className="mx-auto h-90 w-90 object-contain mb-10"
          />
        <CardHeader>
          <CardTitle>Criar conta</CardTitle>
          <CardDescription>Cadastre seu vendedor e o usuário administrador.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(aoSubmeter)} noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nome_vendedor">Nome da empresa</Label>
              <Input id="nome_vendedor" {...register('nome_vendedor')} />
              {errors.nome_vendedor && (
                <p className="text-sm text-destructive">{errors.nome_vendedor.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nome_usuario">Seu nome</Label>
              <Input id="nome_usuario" {...register('nome_usuario')} />
              {errors.nome_usuario && (
                <p className="text-sm text-destructive">{errors.nome_usuario.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" autoComplete="email" {...register('email')} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                autoComplete="new-password"
                {...register('senha')}
              />
              {errors.senha && <p className="text-sm text-destructive">{errors.senha.message}</p>}
            </div>
            {erro && <p className="text-sm text-destructive">{erro}</p>}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Cadastrando...' : 'Criar conta'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Já tem conta?{' '}
            <Link to="/login" className="font-medium text-primary underline">
              Entrar
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
