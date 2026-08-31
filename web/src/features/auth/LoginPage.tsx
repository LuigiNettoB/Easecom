import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Mail, Lock, Eye, EyeOff, Sparkles } from 'lucide-react'
import { useAuth } from '@/shared/auth/AuthContext'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Input'
import { Label } from '@/shared/ui/Label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/Card'
import { loginSchema, type LoginFormValores } from '@/features/auth/schemas'
import type { ErroApi } from '@/shared/api/types'

export function LoginPage() {
  const { entrar } = useAuth()
  const navigate = useNavigate()
  const [erro, setErro] = useState<string | null>(null)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValores>({ resolver: zodResolver(loginSchema) })

  async function aoSubmeter(valores: LoginFormValores) {
    setErro(null)
    try {
      await entrar(valores)
      navigate('/', { replace: true })
    } catch (erroRequisicao) {
      if (axios.isAxiosError<ErroApi>(erroRequisicao)) {
        setErro(erroRequisicao.response?.data.mensagem ?? 'Não foi possível entrar.')
      } else {
        setErro('Não foi possível entrar.')
      }
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#062f3d] via-[#0a4a6e] to-[#3fae4e] p-4">
      {/* Padrão decorativo de fundo (cubos), puramente visual */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.15]">
        <svg
          className="h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <pattern id="cubes" width="90" height="104" patternUnits="userSpaceOnUse">
              <g stroke="#e9f0ea" strokeWidth="1" fill="none">
                <polygon points="45,4 80,24 80,64 45,84 10,64 10,24" />
                <line x1="45" y1="42" x2="45" y2="82" />
                <line x1="10" y1="24" x2="45" y2="44" />
                <line x1="80" y1="24" x2="45" y2="44" />
              </g>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#cubes)" />
        </svg>
      </div>

      <Card className="relative w-full max-w-sm rounded-3xl border border-white/30 bg-white/30 shadow-2xl backdrop-blur-xl">
        <CardHeader className="pb-2">
          <img
            src="../public/logo.png"
            alt="Logo EaseCom"
            className="mx-auto mb-4 h-90 w-90 object-contain"
          />
          
          <CardTitle className="text-2xl font-bold text-slate-900">Entrar</CardTitle>
          <CardDescription className="text-slate-700">
            Acesse o EaseCom com seu e-mail e senha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(aoSubmeter)} noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-slate-700">
                E-mail
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="h-14 rounded-2xl border-white/40 bg-white/60 pl-10 text-slate-900 placeholder:text-slate-500"
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-slate-700">
                Senha
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  id="password"
                  type={mostrarSenha ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="h-14 rounded-2xl border-white/40 bg-white/60 pl-10 pr-10 text-slate-900 placeholder:text-slate-500"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((valor) => !valor)}
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                >
                  {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-sm text-[#00305c] hover:underline"
                >
                  Esqueceu a senha?
                </button>
              </div>
            </div>

            {erro && <p className="text-sm text-destructive">{erro}</p>}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-14 rounded-full bg-gradient-to-r from-[#00305c] to-[#005DAA] text-base font-bold text-white shadow-lg hover:opacity-90"
            >
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <p className="mt-4 flex items-center justify-center gap-1 text-center text-sm text-slate-700">
            Ainda não tem conta?{' '}
            <Link to="/cadastro" className="font-bold hover:underline">
              Cadastre-se
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}