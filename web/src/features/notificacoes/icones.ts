import {
  ArchiveBoxIcon,
  Cog6ToothIcon,
  CubeIcon,
  MegaphoneIcon,
  ShoppingCartIcon,
} from '@heroicons/react/24/outline'

import type { Categoria } from './dados'

export const ICONES: Record<Categoria, typeof CubeIcon> = {
  vendas: ShoppingCartIcon,
  estoque: ArchiveBoxIcon,
  anuncios: MegaphoneIcon,
  fornecedores: CubeIcon,
  sistema: Cog6ToothIcon,
}
