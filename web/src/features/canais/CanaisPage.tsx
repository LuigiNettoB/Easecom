import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import axios from 'axios'

import { api } from '@/shared/api/client'
import { Button } from '@/shared/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/Card'
import type { ErroApi } from '@/shared/api/types'

export function CanaisPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [conectando, setConectando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [conectado, setConectado] = useState(false)
  const [carregandoStatus, setCarregandoStatus] = useState(true)

  // Capturado uma única vez na montagem: a query string é limpa da URL logo
  // em seguida, mas a mensagem de sucesso/erro precisa continuar na tela.
  const [status] = useState(() => searchParams.get('mercado_livre'))

  useEffect(() => {
    if (status) {
      setSearchParams({}, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    async function carregarStatus() {
      try {
        const { data } = await api.get<{ conectado: boolean }>('/canais/mercado-livre/status')
        setConectado(data.conectado)
      } finally {
        setCarregandoStatus(false)
      }
    }
    void carregarStatus()
  }, [])

  async function conectarMercadoLivre() {
    setErro(null)
    setConectando(true)
    try {
      const { data } = await api.get<{ url: string }>('/canais/mercado-livre/conectar')
      window.location.href = data.url
    } catch (erroRequisicao) {
      if (axios.isAxiosError<ErroApi>(erroRequisicao)) {
        setErro(erroRequisicao.response?.data.mensagem ?? 'Não foi possível iniciar a conexão.')
      } else {
        setErro('Não foi possível iniciar a conexão.')
      }
      setConectando(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Canais</h1>

      <Card>
        <CardHeader>
          <CardTitle>Mercado Livre</CardTitle>
          <CardDescription>
            Conecte sua conta do Mercado Livre para sincronizar anúncios e pedidos.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-3">
          {status === 'conectado' && (
            <p className="text-sm text-primary">Conta do Mercado Livre conectada com sucesso.</p>
          )}
          {status === 'erro' && (
            <p className="text-sm text-destructive">
              Não foi possível conectar sua conta do Mercado Livre. Tente novamente.
            </p>
          )}
          {erro && <p className="text-sm text-destructive">{erro}</p>}
          <Button
            onClick={conectarMercadoLivre}
            disabled={conectando || carregandoStatus || conectado}
          >
            {conectado ? 'Conectado' : conectando ? 'Redirecionando...' : 'Conectar Mercado Livre'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
