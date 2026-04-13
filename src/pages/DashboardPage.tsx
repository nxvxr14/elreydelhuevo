import { useState, useEffect, useCallback } from 'react'
import { insforge } from '@/lib/insforge'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, getCurrentDate, getFirstDayOfMonth, getLastDayOfMonth, formatQuantity, formatDate } from '@/lib/utils'
import { LOW_STOCK_THRESHOLD } from '@/lib/constants'
import type { Sale, Expense, Product } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { PageLoading } from '@/components/ui/loading'
import {
  LayoutDashboard, DollarSign, TrendingUp, TrendingDown,
  ShoppingCart, Receipt, AlertTriangle, Package
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts'

interface DashboardData {
  totalSales: number
  totalExpenses: number
  totalProfit: number
  salesCount: number
  expensesCount: number
  totalCredits: number
  creditCount: number
  lowStockProducts: (Product & { stock: number })[]
  dailySales: { date: string; total: number }[]
  paymentBreakdown: { name: string; value: number }[]
  urgentCredits: { client_name: string; total: number; days: number }[]
}

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7']

export function DashboardPage() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(getFirstDayOfMonth())
  const [dateTo, setDateTo] = useState(getLastDayOfMonth())
  const [data, setData] = useState<DashboardData>({
    totalSales: 0, totalExpenses: 0, totalProfit: 0,
    salesCount: 0, expensesCount: 0,
    totalCredits: 0, creditCount: 0,
    lowStockProducts: [], dailySales: [], paymentBreakdown: [], urgentCredits: [],
  })

  const fetchDashboard = useCallback(async () => {
    try {
      const [salesRes, expensesRes, creditsRes, stockRes] = await Promise.all([
        // Sales in period
        insforge.database
          .from('sales')
          .select('total, payment_method, created_at')
          .neq('payment_method', 'credit')
          .gte('created_at', dateFrom + 'T00:00:00')
          .lte('created_at', dateTo + 'T23:59:59'),
        // Expenses in period
        insforge.database
          .from('expenses')
          .select('amount')
          .gte('date', dateFrom)
          .lte('date', dateTo),
        // Pending credits
        insforge.database
          .from('sales')
          .select('total, total_paid, client_id, created_at, clients(name)')
          .eq('status', 'pending')
          .order('created_at', { ascending: true }),
        // Low stock products
        insforge.database
          .from('product_stock')
          .select('quantity, products(id, name, price), warehouses!inner(is_default)')
          .eq('warehouses.is_default', true)
          .lt('quantity', LOW_STOCK_THRESHOLD),
      ])

      // Sales metrics
      const sales = (salesRes.data || []) as { total: number; payment_method: string; created_at: string }[]
      const totalSales = sales.reduce((s, e) => s + e.total, 0)

      // Also get credit payments (abonos) as income
      const { data: paymentsData } = await insforge.database
        .from('payments')
        .select('amount')
        .gte('created_at', dateFrom + 'T00:00:00')
        .lte('created_at', dateTo + 'T23:59:59')
      const totalPayments = ((paymentsData || []) as { amount: number }[]).reduce((s, p) => s + p.amount, 0)

      // Expenses
      const expenses = (expensesRes.data || []) as { amount: number }[]
      const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)

      // Credits
      const credits = (creditsRes.data || []) as Record<string, unknown>[]
      let totalCredits = 0
      const urgentMap = new Map<string, { client_name: string; total: number; days: number }>()
      for (const c of credits) {
        const debt = (c.total as number) - (c.total_paid as number)
        totalCredits += debt
        const clientName = (c.clients as { name: string } | null)?.name || 'Sin cliente'
        const clientId = c.client_id as string
        const days = Math.floor((Date.now() - new Date(c.created_at as string).getTime()) / (1000 * 60 * 60 * 24))
        if (!urgentMap.has(clientId)) {
          urgentMap.set(clientId, { client_name: clientName, total: 0, days: 0 })
        }
        const entry = urgentMap.get(clientId)!
        entry.total += debt
        if (days > entry.days) entry.days = days
      }
      const urgentCredits = Array.from(urgentMap.values())
        .filter(u => u.days > 15)
        .sort((a, b) => b.days - a.days)
        .slice(0, 10)

      // Low stock
      const lowStock = ((stockRes.data || []) as Record<string, unknown>[]).map(s => ({
        ...(s.products as Product),
        stock: s.quantity as number,
      })).sort((a, b) => a.stock - b.stock)

      // Daily sales chart
      const dailyMap = new Map<string, number>()
      for (const s of sales) {
        const date = (s.created_at as string).substring(0, 10)
        dailyMap.set(date, (dailyMap.get(date) || 0) + s.total)
      }
      const dailySales = Array.from(dailyMap.entries())
        .map(([date, total]) => ({ date, total }))
        .sort((a, b) => a.date.localeCompare(b.date))

      // Payment breakdown
      const methodMap = new Map<string, number>()
      for (const s of sales) {
        const method = s.payment_method === 'cash' ? 'Efectivo' : 'Transferencia'
        methodMap.set(method, (methodMap.get(method) || 0) + s.total)
      }
      if (totalPayments > 0) {
        methodMap.set('Abonos', totalPayments)
      }
      const paymentBreakdown = Array.from(methodMap.entries()).map(([name, value]) => ({ name, value }))

      setData({
        totalSales: totalSales + totalPayments,
        totalExpenses,
        totalProfit: totalSales + totalPayments - totalExpenses,
        salesCount: sales.length,
        expensesCount: expenses.length,
        totalCredits,
        creditCount: credits.length,
        lowStockProducts: lowStock,
        dailySales,
        paymentBreakdown,
        urgentCredits,
      })
    } catch {
      showToast('Error cargando dashboard', 'danger')
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo, showToast])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  if (loading) return <PageLoading />

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-primary" />
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">Resumen general del negocio</p>
        </div>
        <div className="flex gap-2">
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ingresos</p>
                <p className="text-xl font-bold text-success">{formatCurrency(data.totalSales)}</p>
                <p className="text-xs text-muted-foreground">{data.salesCount} ventas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gastos</p>
                <p className="text-xl font-bold text-destructive">{formatCurrency(data.totalExpenses)}</p>
                <p className="text-xs text-muted-foreground">{data.expensesCount} gastos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ganancia Neta</p>
                <p className={`text-xl font-bold ${data.totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(data.totalProfit)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Creditos Pendientes</p>
                <p className="text-xl font-bold text-warning">{formatCurrency(data.totalCredits)}</p>
                <p className="text-xs text-muted-foreground">{data.creditCount} ventas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily sales chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ventas Diarias</CardTitle>
          </CardHeader>
          <CardContent>
            {data.dailySales.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Sin datos</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.dailySales}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={d => d.substring(5)} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value) => [formatCurrency(value as number), 'Ventas']}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Payment method pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Metodos de Pago</CardTitle>
          </CardHeader>
          <CardContent>
            {data.paymentBreakdown.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Sin datos</p>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="60%" height={250}>
                  <PieChart>
                    <Pie
                      data={data.paymentBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      dataKey="value"
                      stroke="none"
                    >
                      {data.paymentBreakdown.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      formatter={(value) => formatCurrency(value as number)}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {data.paymentBreakdown.map((entry, i) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-sm">{entry.name}</span>
                      <span className="text-sm font-mono font-bold">{formatCurrency(entry.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Low stock */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-warning" />
              Stock Bajo ({data.lowStockProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.lowStockProducts.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Todos los productos tienen stock suficiente</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.lowStockProducts.slice(0, 10).map(p => (
                    <TableRow key={p.id}>
                      <TableCell>{p.name}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={p.stock <= 0 ? 'destructive' : 'warning'}>
                          {formatQuantity(p.stock)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Urgent credits */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Creditos Urgentes ({data.urgentCredits.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.urgentCredits.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Sin creditos urgentes</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Deuda</TableHead>
                    <TableHead className="text-right">Dias</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.urgentCredits.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell>{c.client_name}</TableCell>
                      <TableCell className="text-right font-mono text-destructive">{formatCurrency(c.total)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive">{c.days}d</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
