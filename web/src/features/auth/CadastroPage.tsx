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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#062f3d] via-[#0a4a6e] to-[#3fae4e] p-4">

      <div className="pointer-events-none absolute inset-0 opacity-[0.15]">
        <svg
          className="h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
        <pattern id="carrinhos" width="140" height="140" patternUnits="userSpaceOnUse">
          <g
            stroke="#e9f0ea"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          >
            {/* alça do carrinho */}
            <path d="M20 25 H32" />

            {/* estrutura do carrinho */}
            <path d="M32 25 L42 75 H105 L120 40 H36" />

            {/* parte inferior / base */}
            <path d="M42 75 H105" />

            {/* rodas */}
            <circle cx="55" cy="91" r="6" />
            <circle cx="96" cy="91" r="6" />
          </g>
        </pattern>
      </defs>
          <rect width="100%" height="100%" fill="url(#carrinhos)" />
        </svg>
      </div>

      <Card className="relative w-full max-w-sm rounded-3xl border border-white/30 bg-black/30 shadow-2xl backdrop-blur-xl">
      <CardHeader className="pb-2">
        <img
            src="../public/logo.png"
            alt="Logo Easecom"
            className="mx-auto h-90 w-90 object-contain -mb-10"
          />

          <CardTitle className="text-2xl font-bold text-white">Criar conta</CardTitle>
          <CardDescription className="text-sm text-white">
            Cadastre seu vendedor e o usuário administrador.</CardDescription>
        </CardHeader>

        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(aoSubmeter)} noValidate>
            <div className="flex flex-col gap-1.5">
              
              <Label htmlFor="nome_vendedor" className="text-white">Nome da empresa</Label>
              <Input 
                id="nome_vendedor" 
                className="h-14 rounded-2xl border-white/40 bg-white/60 pl-10 text-slate-900 placeholder:text-slate-500"
                {...register('nome_vendedor')} />
              {errors.nome_vendedor && (
                <p className="text-sm text-destructive">{errors.nome_vendedor.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nome_usuario" className="text-white">Seu nome</Label>
              <Input 
                id="nome_usuario" 
                className="h-14 rounded-2xl border-white/40 bg-white/60 pl-10 text-slate-900 placeholder:text-slate-500"
                {...register('nome_usuario')} />
              {errors.nome_usuario && (
                <p className="text-sm text-destructive">{errors.nome_usuario.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-white">E-mail</Label>
              <Input 
                id="email" 
                type="email" 
                autoComplete="email" 
                className="h-14 rounded-2xl border-white/40 bg-white/60 pl-10 text-slate-900 placeholder:text-slate-500"
                {...register('email')} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="senha" className="text-white">Senha</Label>
              <Input
                id="senha"
                type="password"
                autoComplete="new-password"
                className="h-14 rounded-2xl border-white/40 bg-white/60 pl-10 text-slate-900 placeholder:text-slate-500"
                {...register('senha')}
              />
              {errors.senha && <p className="text-sm text-destructive">{errors.senha.message}</p>}
            </div>
            {erro && <p className="text-sm text-destructive">{erro}</p>}
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="h-14 rounded-full bg-gradient-to-r from-[#00305c] to-[#005DAA] text-base font-bold text-white shadow-lg hover:opacity-90"
            >
              {isSubmitting ? 'Cadastrando...' : 'Criar conta'}
            </Button>
          </form>
          <p className="mt-4 flex items-center justify-center gap-1 text-center text-sm text-emerald-300">
            Já tem conta?{' '}
            <Link to="/login" className="font-bold hover:underline">
              Entrar
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
