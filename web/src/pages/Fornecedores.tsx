import { useState } from 'react'
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'

import { Button } from '@/shared/ui/Button'
import { Card, CardContent } from '@/shared/ui/Card'
import { Input } from '@/shared/ui/Input'
import { Label } from '@/shared/ui/Label'
import { cn } from '@/shared/lib/cn'

type Fornecedor = {
  id: string
  nome: string
  iniciais: string
  email: string
  produtosVinculados: number
}

const FORNECEDORES_INICIAIS: Fornecedor[] = [
  {
    id: 'tech-import',
    nome: 'Tech Import LTDA',
    iniciais: 'TX',
    email: 'contato@techimport.com',
    produtosVinculados: 12,
  },
  {
    id: 'confeccoes-real',
    nome: 'Confecções Real',
    iniciais: 'CF',
    email: 'vendas@real.com.br',
    produtosVinculados: 8,
  },
  {
    id: 'acessorios-sp',
    nome: 'Acessórios SP',
    iniciais: 'AC',
    email: 'compras@acessp.com',
    produtosVinculados: 5,
  },
  {
    id: 'garrafas-termicos',
    nome: 'Garrafas & Térmicos',
    iniciais: 'GT',
    email: 'pedidos@garrafas.com',
    produtosVinculados: 3,
  },
]

// alterna azul/verde entre os cards, na mesma ordem em que aparecem
const CORES_AVATAR = ['bg-[#005DAA]', 'bg-[#85FA51]']
const CORES_TEXTO_AVATAR = ['text-white', 'text-[#173404]']

type NovoFornecedorForm = {
  nome: string
  email: string
}

const FORM_VAZIO: NovoFornecedorForm = { nome: '', email: '' }

function gerarIniciais(nome: string) {
  const palavras = nome.trim().split(/\s+/)
  const primeira = palavras[0]?.[0] ?? ''
  const segunda = palavras[1]?.[0] ?? ''
  return (primeira + segunda).toUpperCase()
}

export function Fornecedores() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>(FORNECEDORES_INICIAIS)
  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState<NovoFornecedorForm>(FORM_VAZIO)

  function abrirModal() {
    setForm(FORM_VAZIO)
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    const novoFornecedor: Fornecedor = {
      id: `novo-${Date.now()}`,
      nome: form.nome.trim(),
      iniciais: gerarIniciais(form.nome),
      email: form.email.trim(),
      produtosVinculados: 0,
    }

    setFornecedores((atual) => [...atual, novoFornecedor])
    fecharModal()
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#00305c]">Fornecedores</h1>
        <Button
          className="flex items-center gap-2 bg-[#005DAA] text-white hover:bg-[#00497f]"
          onClick={abrirModal}
          type="button"
        >
          <PlusIcon className="h-4 w-4" />
          Novo fornecedor
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {fornecedores.map((fornecedor, indice) => (
          <Card key={fornecedor.id}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-medium',
                    CORES_AVATAR[indice % 2],
                    CORES_TEXTO_AVATAR[indice % 2],
                  )}
                >
                  {fornecedor.iniciais}
                </div>
                <div>
                  <p className="font-medium text-foreground">{fornecedor.nome}</p>
                  <p className="text-sm text-muted-foreground">{fornecedor.email}</p>
                </div>
              </div>
              <div className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground">
                {fornecedor.produtosVinculados} produtos vinculados
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {fornecedores.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Nenhum fornecedor cadastrado.
        </p>
      )}

      {modalAberto && (
        <div
          aria-labelledby="titulo-cadastro-fornecedor"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={fecharModal}
          role="dialog"
        >
          <div
            className="relative w-full max-w-sm rounded-lg bg-background p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              aria-label="Fechar cadastro"
              className="absolute right-3 top-3 rounded-md p-2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA]"
              onClick={fecharModal}
              type="button"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>

            <h2
              className="mb-4 text-lg font-semibold text-[#00305c]"
              id="titulo-cadastro-fornecedor"
            >
              Novo fornecedor
            </h2>

            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  onChange={(event) => setForm((atual) => ({ ...atual, nome: event.target.value }))}
                  required
                  value={form.nome}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">E-mail de contato</Label>
                <Input
                  id="email"
                  onChange={(event) =>
                    setForm((atual) => ({ ...atual, email: event.target.value }))
                  }
                  required
                  type="email"
                  value={form.email}
                />
              </div>

              <div className="mt-2 flex justify-end gap-2">
                <Button onClick={fecharModal} type="button" variant="outline">
                  Cancelar
                </Button>
                <Button className="bg-[#005DAA] text-white hover:bg-[#00497f]" type="submit">
                  Cadastrar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}