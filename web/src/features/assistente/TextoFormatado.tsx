import type { ReactNode } from 'react'

// Formatação mínima das respostas do assistente (negrito, código, títulos e
// listas), montada como elementos React — nunca como HTML, então um texto
// vindo da IA não consegue injetar nada na página.

function formatarTrecho(texto: string, chave: string): ReactNode[] {
  return texto
    .split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    .filter(Boolean)
    .map((parte, indice) => {
      if (parte.startsWith('**') && parte.endsWith('**')) {
        return <strong key={`${chave}-${indice}`}>{parte.slice(2, -2)}</strong>
      }
      if (parte.startsWith('`') && parte.endsWith('`')) {
        return (
          <code key={`${chave}-${indice}`} className="rounded bg-black/5 px-1 text-[0.85em]">
            {parte.slice(1, -1)}
          </code>
        )
      }
      return parte
    })
}

export function TextoFormatado({ texto }: { texto: string }) {
  const blocos: ReactNode[] = []
  let itensLista: ReactNode[] = []

  const fecharLista = () => {
    if (itensLista.length) {
      blocos.push(
        <ul key={`lista-${blocos.length}`} className="ml-4 list-disc space-y-0.5">
          {itensLista}
        </ul>,
      )
      itensLista = []
    }
  }

  texto.split('\n').forEach((linhaBruta, indice) => {
    const linha = linhaBruta.trimEnd()
    const item = linha.match(/^\s*[-*•]\s+(.*)$/)
    const titulo = linha.match(/^#{1,6}\s+(.*)$/)

    if (item) {
      itensLista.push(<li key={indice}>{formatarTrecho(item[1], `li-${indice}`)}</li>)
      return
    }
    fecharLista()
    if (!linha.trim()) return
    if (titulo) {
      blocos.push(
        <p key={indice} className="font-semibold">
          {formatarTrecho(titulo[1], `h-${indice}`)}
        </p>,
      )
      return
    }
    blocos.push(<p key={indice}>{formatarTrecho(linha, `p-${indice}`)}</p>)
  })
  fecharLista()

  return <div className="space-y-2">{blocos}</div>
}
