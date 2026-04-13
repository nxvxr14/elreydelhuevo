import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard, ShoppingCart, Package, Tags, Users,
  Receipt, Wallet, ArrowLeftRight, DollarSign, Warehouse,
  CreditCard, BarChart3, LogOut, Egg, Menu, X
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/pos', label: 'Punto de Venta', icon: ShoppingCart },
  { path: '/products', label: 'Productos', icon: Package },
  { path: '/categories', label: 'Categorias', icon: Tags },
  { path: '/clients', label: 'Clientes', icon: Users },
  { path: '/sales', label: 'Ventas', icon: Receipt },
  { path: '/expenses', label: 'Gastos', icon: Wallet },
  { path: '/inventory', label: 'Inventario', icon: ArrowLeftRight },
  { path: '/cash-register', label: 'Caja', icon: DollarSign },
  { path: '/warehouses', label: 'Bodegas', icon: Warehouse },
  { path: '/portfolio', label: 'Cartera', icon: CreditCard },
  { path: '/reports', label: 'Reportes', icon: BarChart3 },
]

export function Sidebar() {
  const location = useLocation()
  const { user, signOut, isAdmin } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-card border"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Backdrop */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-card border-r flex flex-col transition-transform lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 p-4 border-b">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Egg className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-sm">El Rey del Huevo</h1>
            <p className="text-xs text-muted-foreground">Sistema POS</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors mb-0.5",
                location.pathname === item.path
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User info */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
              {user?.profile?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.profile?.name || 'Usuario'}</p>
              <p className="text-xs text-muted-foreground">
                {isAdmin ? 'Administrador' : 'Vendedor'}
              </p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Cerrar Sesion
          </button>
        </div>
      </aside>
    </>
  )
}
