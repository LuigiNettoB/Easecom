import { useEffect, useRef, useState } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

type MultiSelectDropdownProps = {
  options: string[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
}

export function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder = 'Selecione',
}: MultiSelectDropdownProps) {
  const [aberto, setAberto] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // fecha o dropdown ao clicar fora ou pressionar Esc
  useEffect(() => {
    function aoClicarFora(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setAberto(false)
      }
    }
    function aoPressionarEsc(event: KeyboardEvent) {
      if (event.key === 'Escape') setAberto(false)
    }

    document.addEventListener('mousedown', aoClicarFora)
    document.addEventListener('keydown', aoPressionarEsc)
    return () => {
      document.removeEventListener('mousedown', aoClicarFora)
      document.removeEventListener('keydown', aoPressionarEsc)
    }
  }, [])

  function alternarOpcao(opcao: string) {
    onChange(
      selected.includes(opcao) ? selected.filter((item) => item !== opcao) : [...selected, opcao],
    )
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-expanded={aberto}
        aria-haspopup="listbox"
        className="flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005DAA]"
        onClick={() => setAberto((atual) => !atual)}
        type="button"
      >
        <span className={selected.length === 0 ? 'text-muted-foreground' : ''}>
          {selected.length === 0 ? placeholder : selected.join(', ')}
        </span>
        <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
      </button>

      {aberto && (
        <div
          className="absolute z-10 mt-1 w-full rounded-md border border-border bg-background py-1 shadow-lg"
          role="listbox"
        >
          {options.map((opcao) => (
            <label
              className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-[#85FA51]/10"
              key={opcao}
            >
              <input
                checked={selected.includes(opcao)}
                className="h-4 w-4 rounded border-input accent-[#005DAA]"
                onChange={() => alternarOpcao(opcao)}
                type="checkbox"
              />
              {opcao}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
