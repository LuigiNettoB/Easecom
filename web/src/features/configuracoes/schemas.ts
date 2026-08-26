import { z } from 'zod'

export const trocarSenhaSchema = z
  .object({
    senha_atual: z.string().min(1, 'Informe a senha atual.'),
    senha_nova: z.string().min(8, 'A nova senha precisa ter ao menos 8 caracteres.'),
    confirmar_senha_nova: z.string().min(1, 'Confirme a nova senha.'),
  })
  .refine((dados) => dados.senha_nova === dados.confirmar_senha_nova, {
    message: 'As senhas não coincidem.',
    path: ['confirmar_senha_nova'],
  })

export type TrocarSenhaFormValores = z.infer<typeof trocarSenhaSchema>
