export const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const moedaCompacta = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
})
export const inteiro = new Intl.NumberFormat('pt-BR')

export function iniciais(nome: string) {
  const partes = nome
    .replace(/[^\p{L}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
  if (!partes[0]) return '?'
  return (
    (partes[0][0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')
  ).toUpperCase()
}
