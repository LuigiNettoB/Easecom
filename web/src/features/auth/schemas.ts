import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe a senha.'),
})
export type LoginFormValores = z.infer<typeof loginSchema>

export const cadastroSchema = z.object({
  nome_vendedor: z.string().min(2, 'Informe o nome da empresa.'),
  nome_usuario: z.string().min(2, 'Informe seu nome.'),
  email: z.string().email('Informe um e-mail válido.'),
  senha: z.string().min(8, 'A senha precisa ter ao menos 8 caracteres.'),
})
export type CadastroFormValores = z.infer<typeof cadastroSchema>
