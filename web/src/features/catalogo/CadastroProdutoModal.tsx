import { useEffect, useRef, useState } from 'react'
import { ArrowUpTrayIcon, CameraIcon, XMarkIcon } from '@heroicons/react/24/outline'

import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Input'
import { Label } from '@/shared/ui/Label'
import { MultiSelectDropdown } from '@/shared/ui/MultiSelectDropdown'

import { CANAIS_DISPONIVEIS, type Produto } from './produtos'

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

type CadastroProdutoModalProps = {
  onFechar: () => void
  onCadastrar: (produto: Produto) => void
}

export function CadastroProdutoModal({ onFechar, onCadastrar }: CadastroProdutoModalProps) {
  const [form, setForm] = useState<NovoProdutoForm>(FORM_VAZIO)

  const [cameraAtiva, setCameraAtiva] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [erroCamera, setErroCamera] = useState<string | null>(null)

  // garante que a câmera é desligada se o modal fechar com ela ainda ativa
  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), [])

  useEffect(() => {
    const fecharComEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onFechar()
    }
    window.addEventListener('keydown', fecharComEsc)
    return () => window.removeEventListener('keydown', fecharComEsc)
  }, [onFechar])

  function fecharModal() {
    pararCamera()
    onFechar()
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

    onCadastrar({
      id: `NOVO-${Date.now()}`,
      nome: form.nome.trim(),
      sku: form.sku.trim(),
      categoria: form.categoria.trim(),
      preco: Number(form.preco.replace(',', '.')) || 0,
      estoque: Number(form.estoque) || 0,
      vendidos: 0,
      canais: form.canais,
      foto: form.foto || FOTO_PADRAO,
    })
    fecharModal()
  }

  return (
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
  )
}
