import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/toast'
import { MainLayout } from '@/components/layout/MainLayout'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { POSPage } from '@/pages/POSPage'
import { ProductsPage } from '@/pages/ProductsPage'
import { CategoriesPage } from '@/pages/CategoriesPage'
import { ClientsPage } from '@/pages/ClientsPage'
import { SalesPage } from '@/pages/SalesPage'
import { ExpensesPage } from '@/pages/ExpensesPage'
import { InventoryPage } from '@/pages/InventoryPage'
import { CashRegisterPage } from '@/pages/CashRegisterPage'
import { WarehousesPage } from '@/pages/WarehousesPage'
import { PortfolioPage } from '@/pages/PortfolioPage'
import { ReportsPage } from '@/pages/ReportsPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/pos" element={<POSPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/sales" element={<SalesPage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/cash-register" element={<CashRegisterPage />} />
              <Route path="/warehouses" element={<WarehousesPage />} />
              <Route path="/portfolio" element={<PortfolioPage />} />
              <Route path="/reports" element={<ReportsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
