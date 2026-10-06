import { Navigate, Route, Routes } from 'react-router-dom'

import { CadastroPage } from '@/features/auth/CadastroPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { PedidosTestePage } from '@/features/pedidos/PedidosTestePage'
import { Canais } from '@/pages/Canais'
import { Catalogo } from '@/pages/Catalogo'
import { Configuracoes } from '@/pages/Configuracoes'
import { Financeiro } from '@/pages/Financeiro'
import { Fornecedores } from '@/pages/Fornecedores'
import { Home } from '@/pages/Home'
import { Layout } from '@/pages/Layout'
import { Notificacoes } from '@/pages/Notificacoes'
import { NotFound } from '@/pages/NotFound'
import { Pedidos } from '@/pages/Pedidos'
import { RotaPrivada, RotaPublica } from '@/shared/auth/RotaPrivada'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<RotaPublica />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cadastro" element={<CadastroPage />} />
      </Route>

      <Route element={<RotaPrivada />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/catalogo" element={<Catalogo />} />
          <Route path="/estoque" element={<Navigate replace to="/catalogo" />} />
          <Route path="/pedidos" element={<Pedidos />} />
          <Route path="/pedidos-teste" element={<PedidosTestePage />} />
          <Route path="/fornecedores" element={<Fornecedores />} />
          <Route path="/financeiro" element={<Financeiro />} />
          <Route path="/canais" element={<Canais />} />
          <Route path="/notificacoes" element={<Notificacoes />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
