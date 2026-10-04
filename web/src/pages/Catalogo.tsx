import { useEffect, useRef, useState } from 'react'
import {
  ArrowUpTrayIcon,
  CameraIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Input'
import { Label } from '@/shared/ui/Label'
import { MultiSelectDropdown } from '@/shared/ui/MultiSelectDropdown'

type Produto = {
  id: string
  nome: string
  sku: string
  categoria: string
  preco: number
  estoque: number
  canais: string[]
  foto: string
}

const PRODUTOS_INICIAIS: Produto[] = [
  {
    id: 'MLB1006547759',
    nome: 'Camiseta Básica Algodão Preta',
    sku: 'CAM-PRE-ALG-01',
    categoria: 'Moda',
    preco: 129.9,
    estoque: 58,
    canais: ['Mercado Livre', 'Shopee'],
    foto: 'https://http2.mlstatic.com/D_547759-I.jpg',
  },
  {
    id: 'MLB1006547760',
    nome: 'Fone de Ouvido Bluetooth Sem Fio 5.3',
    sku: 'FON-BT-53-01',
    categoria: 'Eletrônicos',
    preco: 189,
    estoque: 142,
    canais: ['Mercado Livre', 'Amazon'],
    foto: 'https://http2.mlstatic.com/D_547760-I.jpg',
  },
  {
    id: 'MLB1006547761',
    nome: 'Garrafa Térmica Inox 750 ml',
    sku: 'GAR-INOX-750',
    categoria: 'Casa e cozinha',
    preco: 79.9,
    estoque: 3,
    canais: ['Mercado Livre'],
    foto: 'https://http2.mlstatic.com/D_547761-I.jpg',
  },
  {
    id: 'MLB1006547762',
    nome: 'Teclado Mecânico Gamer 87 Teclas RGB',
    sku: 'TEC-GAM-87-RGB',
    categoria: 'Eletrônicos',
    preco: 349,
    estoque: 27,
    canais: ['Mercado Livre', 'Amazon', 'Shopee'],
    foto: 'https://http2.mlstatic.com/D_547762-I.jpg',
  },
  {
    id: 'MLB1006547763',
    nome: 'Mochila Couro Sintético para Notebook 15',
    sku: 'MOC-COURO-15',
    categoria: 'Bolsas e malas',
    preco: 219.9,
    estoque: 6,
    canais: ['Mercado Livre', 'Shopee'],
    foto: 'https://http2.mlstatic.com/D_547763-I.jpg',
  },
]

const CANAIS_DISPONIVEIS = ['Mercado Livre', 'Shopee', 'Amazon', 'Magalu']

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const LIMITE_ESTOQUE_BAIXO = 10

const FOTO_PADRAO =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="100%" height="100%" fill="%23e5e7eb"/></svg>',
  )

type NovoProdutoForm = {
  nome: string
  sku: string
  categoria: string
  preco: string
  estoque: string
  canais: string[]
  foto: string
}

const FORM_VAZIO: NovoProdutoForm = {
  nome: '',
  sku: '',
  categoria: '',
  preco: '',
  estoque: '',
  canais: [],
  foto: '',
}

export function Catalogo() {
  const [produtos, setProdutos] = useState<Produto[]>(PRODUTOS_INICIAIS)
  const [busca, setBusca] = useState('')
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)

  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState<NovoProdutoForm>(FORM_VAZIO)

  const [cameraAtiva, setCameraAtiva] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [erroCamera, setErroCamera] = useState<string | null>(null)

  useEffect(() => {
    const fecharComEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProdutoSelecionado(null)
        setModalAberto(false)
      }
    }
    window.addEventListener('keydown', fecharComEsc)
    return () => window.removeEventListener('keydown', fecharComEsc)
  }, [])

  // garante que a câmera é desligada se o modal fechar com ela ainda ativa
  useEffect(() => {
    if (!modalAberto) pararCamera()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalAberto])

  const termo = busca.trim().toLocaleLowerCase('pt-BR')
  const produtosFiltrados = produtos.filter((produto) =>
    [produto.nome, produto.sku, produto.categoria].some((valor) =>
      valor.toLocaleLowerCase('pt-BR').includes(termo),
    ),
  )

  function abrirModal() {
    setForm(FORM_VAZIO)
    setErroCamera(null)
    setModalAberto(true)
  }

  function fecharModal() {
    pararCamera()
    setModalAberto(false)
  }

  function handleUploadArquivo(event: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0]
    if (!arquivo) return
    const leitor = new FileReader()
    leitor.onload = () => {
      setForm((atual) => ({ ...atual, foto: leitor.result as string }))
    }
    leitor.readAsDataURL(arquivo)
  }

  async function abrirCamera() {
    setErroCamera(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      setCameraAtiva(true)
      // o <video> só existe depois do próximo render, então aguarda o ciclo
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
      })
    } catch {
      setErroCamera('Não foi possível acessar a câmera. Verifique as permissões do navegador.')
    }
  }

  function pararCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setCameraAtiva(false)
  }

  function capturarFoto() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const contexto = canvas.getContext('2d')
    if (!contexto) return

    contexto.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    setForm((atual) => ({ ...atual, foto: dataUrl }))
    pararCamera()
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    const novoProduto: Produto = {
      id: `NOVO-${Date.now()}`,
      nome: form.nome.trim(),
      sku: form.sku.trim(),
      categoria: form.categoria.trim(),
      preco: Number(form.preco.replace(',', '.')) || 0,
      estoque: Number(form.estoque) || 0,
      canais: form.canais,
      foto: form.foto || FOTO_PADRAO,
    }

    setProdutos((atual) => [novoProduto, ...atual])
    fecharModal()
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#00305c]">Catálogo e estoque</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visualize seus produtos, o estoque disponível e os canais em que estão anunciados.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Buscar produto"
              className="pl-9 focus-visible:ring-[#005DAA]"
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar produto ou SKU"
              value={busca}
            />
          </div>
          <Button
            className="flex items-center gap-2 whitespace-nowrap bg-[#005DAA] text-white hover:bg-[#00497f]"
            onClick={abrirModal}
            type="button"
          >
            <PlusIcon className="h-4 w-4" />
            Cadastrar produto
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-background shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-border bg-[#005DAA]/5 text-xs font-semibold uppercase tracking-wide text-[#005DAA]">
              <tr>
                <th className="w-20 px-5 py-3">Foto</th>
                <th className="px-5 py-3">Produto</th>
                <th className="px-5 py-3">SKU</th>
                <th className="px-5 py-3">Categoria</th>
                <th className="px-5 py-3">Preço</th>
                <th className="px-5 py-3">Estoque</th>
                <th className="px-5 py-3">Canais</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {produtosFiltrados.map((produto) => {
                const estoqueBaixo = produto.estoque <= LIMITE_ESTOQUE_BAIXO

                return (
                  <tr className="transition-colors hover:bg-[#85FA51]/10" key={produto.id}>
                    <td className="px-5 py-3">
                      <button
                        aria-label={`Ampliar foto de ${produto.nome}`}
                        className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA]"
                        onClick={() => setProdutoSelecionado(produto)}
                        type="button"
                      >
                        <img
                          alt={`Foto de ${produto.nome}`}
                          className="h-11 w-11 rounded-md border border-border object-cover"
                          src={produto.foto}
                        />
                      </button>
                    </td>
                    <td className="px-5 py-3 font-medium text-foreground">{produto.nome}</td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                      {produto.sku}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{produto.categoria}</td>
                    <td className="px-5 py-3 font-medium text-[#00305c]">
                      {moeda.format(produto.preco)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {produto.estoque} un.
                        </span>
                        <span
                          className={
                            estoqueBaixo
                              ? 'rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800'
                              : 'rounded-full bg-[#85FA51]/25 px-2.5 py-1 text-xs font-medium text-[#1f5c0a]'
                          }
                        >
                          {estoqueBaixo ? 'Baixo' : 'Normal'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {produto.canais.map((canal) => (
                          <span
                            className="rounded-full bg-[#005DAA]/10 px-2.5 py-1 text-xs font-medium text-[#005DAA]"
                            key={canal}
                          >
                            {canal}
                          </span>
                        ))}
                        {produto.canais.length === 0 && (
                          <span className="text-xs text-muted-foreground">Nenhum canal</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {produtosFiltrados.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            Nenhum produto encontrado.
          </p>
        )}
      </div>

      {/* Modal: visualizar foto ampliada */}
      {produtoSelecionado && (
        <div
          aria-labelledby="titulo-imagem-produto"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setProdutoSelecionado(null)}
          role="dialog"
        >
          <div
            className="relative max-h-full w-full max-w-xl rounded-lg bg-background p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              aria-label="Fechar imagem ampliada"
              className="absolute right-2 top-2 rounded-md bg-background/90 p-2 text-muted-foreground shadow-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA]"
              onClick={() => setProdutoSelecionado(null)}
              type="button"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
            <img
              alt={`Foto ampliada de ${produtoSelecionado.nome}`}
              className="max-h-[70vh] w-full rounded-md object-contain"
              src={produtoSelecionado.foto}
            />
            <p className="px-1 pt-3 text-sm font-medium" id="titulo-imagem-produto">
              {produtoSelecionado.nome}
            </p>
          </div>
        </div>
      )}

      {/* Modal: cadastrar produto */}
      {modalAberto && (
        <div
          aria-labelledby="titulo-cadastro-produto"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={fecharModal}
          role="dialog"
        >
          <div
            className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-background p-6 shadow-xl"
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

            <h2 className="mb-4 text-lg font-semibold text-[#00305c]" id="titulo-cadastro-produto">
              Cadastrar produto
            </h2>

            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nome">Nome do produto</Label>
                <Input
                  id="nome"
                  onChange={(event) => setForm((atual) => ({ ...atual, nome: event.target.value }))}
                  required
                  value={form.nome}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    onChange={(event) => setForm((atual) => ({ ...atual, sku: event.target.value }))}
                    required
                    value={form.sku}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="categoria">Categoria</Label>
                  <Input
                    id="categoria"
                    onChange={(event) =>
                      setForm((atual) => ({ ...atual, categoria: event.target.value }))
                    }
                    required
                    value={form.categoria}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="preco">Preço (R$)</Label>
                  <Input
                    id="preco"
                    inputMode="decimal"
                    onChange={(event) => setForm((atual) => ({ ...atual, preco: event.target.value }))}
                    placeholder="0,00"
                    required
                    value={form.preco}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="estoque">Estoque (un.)</Label>
                  <Input
                    id="estoque"
                    inputMode="numeric"
                    onChange={(event) =>
                      setForm((atual) => ({ ...atual, estoque: event.target.value }))
                    }
                    placeholder="0"
                    required
                    value={form.estoque}
                  />
                </div>
              </div>

              {/* Dropdown de canais */}
              <div className="flex flex-col gap-1.5">
                <Label>Canais</Label>
                <MultiSelectDropdown
                  onChange={(canais) => setForm((atual) => ({ ...atual, canais }))}
                  options={CANAIS_DISPONIVEIS}
                  placeholder="Selecione os canais"
                  selected={form.canais}
                />
              </div>

              {/* Foto: upload ou câmera */}
              <div className="flex flex-col gap-1.5">
                <Label>Foto do produto</Label>

                {cameraAtiva ? (
                  <div className="flex flex-col gap-2">
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video
                      autoPlay
                      className="w-full rounded-md border border-border"
                      muted
                      playsInline
                      ref={videoRef}
                    />
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-[#005DAA] text-white hover:bg-[#00497f]"
                        onClick={capturarFoto}
                        type="button"
                      >
                        Capturar foto
                      </Button>
                      <Button onClick={pararCamera} type="button" variant="outline">
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {form.foto && (
                      <img
                        alt="Pré-visualização da foto do produto"
                        className="h-28 w-28 rounded-md border border-border object-cover"
                        src={form.foto}
                      />
                    )}
                    <div className="flex flex-wrap gap-2">
                      <label className="flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm hover:bg-[#85FA51]/10">
                        <ArrowUpTrayIcon className="h-4 w-4" />
                        Enviar arquivo
                        <input
                          accept="image/*"
                          className="hidden"
                          onChange={handleUploadArquivo}
                          type="file"
                        />
                      </label>
                      <Button
                        className="flex items-center gap-2"
                        onClick={abrirCamera}
                        type="button"
                        variant="outline"
                      >
                        <CameraIcon className="h-4 w-4" />
                        Tirar foto
                      </Button>
                    </div>
                    {erroCamera && <p className="text-xs text-red-700">{erroCamera}</p>}
                  </div>
                )}

                {/* canvas invisível usado só para capturar o frame da câmera */}
                <canvas className="hidden" ref={canvasRef} />
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