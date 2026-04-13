import { useState, useCallback } from 'react'
import { insforge } from '@/lib/insforge'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDateTime, formatQuantity, getCurrentDate } from '@/lib/utils'
import { PAYMENT_METHODS, TRANSFER_TYPES, EXIT_REASONS, INVENTORY_TYPES } from '@/lib/constants'
import type { DailyReport } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { LoadingSpinner } from '@/components/ui/loading'
import { BarChart3, FileText, Calendar, DollarSign, ShoppingCart, Wallet, ArrowLeftRight, CreditCard, Package, Receipt } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

type ReportType = 'daily' | 'sales' | 'expenses' | 'inventory' | 'credits' | 'payments' | 'products' | 'cash'

const reportTypes: { key: ReportType; label: string; icon: typeof FileText }[] = [
  { key: 'daily', label: 'Reporte Diario', icon: Calendar },
  { key: 'sales', label: 'Ventas', icon: ShoppingCart },
  { key: 'expenses', label: 'Gastos', icon: Wallet },
  { key: 'inventory', label: 'Inventario', icon: ArrowLeftRight },
  { key: 'credits', label: 'Creditos', icon: CreditCard },
  { key: 'payments', label: 'Pagos', icon: DollarSign },
  { key: 'products', label: 'Productos', icon: Package },
  { key: 'cash', label: 'Caja', icon: Receipt },
]

export function ReportsPage() {
  const { showToast } = useToast()
  const [activeReport, setActiveReport] = useState<ReportType>('daily')
  const [dateFrom, setDateFrom] = useState(getCurrentDate())
  const [dateTo, setDateTo] = useState(getCurrentDate())
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<DailyReport | Record<string, unknown>[] | null>(null)

  const generateReport = useCallback(async () => {
    setLoading(true)
    setReportData(null)
    try {
      switch (activeReport) {
        case 'daily':
          await generateDailyReport()
          break
        case 'sales':
          await generateSalesReport()
          break
        case 'expenses':
          await generateExpensesReport()
          break
        case 'inventory':
          await generateInventoryReport()
          break
        case 'credits':
          await generateCreditsReport()
          break
        case 'payments':
          await generatePaymentsReport()
          break
        case 'products':
          await generateProductsReport()
          break
        case 'cash':
          await generateCashReport()
          break
      }
    } catch {
      showToast('Error generando reporte', 'danger')
    } finally {
      setLoading(false)
    }
  }, [activeReport, dateFrom, dateTo])

  const generateDailyReport = async () => {
    const date = dateFrom

    // Sales
    const { data: sales } = await insforge.database
      .from('sales')
      .select('total, payment_method, transfer_type')
      .gte('created_at', date + 'T00:00:00')
      .lte('created_at', date + 'T23:59:59')
      .neq('payment_method', 'credit')

    const salesData = (sales || []) as { total: number; payment_method: string; transfer_type: string | null }[]
    let cashSales = 0, transferSales = 0, nequiSales = 0, bancoSales = 0, daviSales = 0
    for (const s of salesData) {
      if (s.payment_method === 'cash') cashSales += s.total
      if (s.payment_method === 'transfer') {
        transferSales += s.total
        if (s.transfer_type === 'nequi') nequiSales += s.total
        if (s.transfer_type === 'bancolombia') bancoSales += s.total
        if (s.transfer_type === 'davivienda') daviSales += s.total
      }
    }

    // Payments (abonos)
    const { data: payments } = await insforge.database
      .from('payments')
      .select('amount, payment_method, transfer_type')
      .gte('created_at', date + 'T00:00:00')
      .lte('created_at', date + 'T23:59:59')

    const paymentsData = (payments || []) as { amount: number; payment_method: string; transfer_type: string | null }[]
    let cashCredits = 0, transferCredits = 0, nequiCredits = 0, bancoCredits = 0, daviCredits = 0
    for (const p of paymentsData) {
      if (p.payment_method === 'cash') cashCredits += p.amount
      if (p.payment_method === 'transfer') {
        transferCredits += p.amount
        if (p.transfer_type === 'nequi') nequiCredits += p.amount
        if (p.transfer_type === 'bancolombia') bancoCredits += p.amount
        if (p.transfer_type === 'davivienda') daviCredits += p.amount
      }
    }

    // Expenses
    const { data: expenses } = await insforge.database
      .from('expenses')
      .select('amount')
      .eq('date', date)
    const totalExpenses = ((expenses || []) as { amount: number }[]).reduce((s, e) => s + e.amount, 0)

    // Inventory
    const { data: inv } = await insforge.database
      .from('inventory_movements')
      .select('type, quantity')
      .gte('created_at', date + 'T00:00:00')
      .lte('created_at', date + 'T23:59:59')

    const invData = (inv || []) as { type: string; quantity: number }[]
    const entries = invData.filter(i => i.type === 'entry').reduce((s, i) => s + i.quantity, 0)
    const exits = invData.filter(i => i.type === 'exit').reduce((s, i) => s + i.quantity, 0)

    // Cash register
    const { data: cr } = await insforge.database
      .from('cash_registers')
      .select()
      .gte('opened_at', date + 'T00:00:00')
      .lte('opened_at', date + 'T23:59:59')
      .maybeSingle()

    const totalSalesAmount = cashSales + transferSales
    const totalCreditsAmount = cashCredits + transferCredits
    const totalIncome = totalSalesAmount + totalCreditsAmount

    const report: DailyReport = {
      sales: {
        total: totalSalesAmount, cash: cashSales, transfer: transferSales,
        nequi: nequiSales, bancolombia: bancoSales, davivienda: daviSales,
        count: salesData.length, baskets: 0,
      },
      credits: {
        total: totalCreditsAmount, cash: cashCredits, transfer: transferCredits,
        nequi: nequiCredits, bancolombia: bancoCredits, davivienda: daviCredits,
        count: paymentsData.length,
      },
      consolidated: {
        totalCash: cashSales + cashCredits,
        totalTransfer: transferSales + transferCredits,
        totalNequi: nequiSales + nequiCredits,
        totalBancolombia: bancoSales + bancoCredits,
        totalDavivienda: daviSales + daviCredits,
      },
      expenses: { total: totalExpenses, count: (expenses || []).length },
      inventory: { entries, exits },
      cashRegister: cr as DailyReport['cashRegister'],
      totalIncome,
      totalProfit: totalIncome - totalExpenses,
    }
    setReportData(report)
  }

  const generateSalesReport = async () => {
    const { data } = await insforge.database
      .from('sales')
      .select('total, payment_method, transfer_type, source, status, created_at, clients(name)')
      .gte('created_at', dateFrom + 'T00:00:00')
      .lte('created_at', dateTo + 'T23:59:59')
      .order('created_at', { ascending: false })
    setReportData(data || [])
  }

  const generateExpensesReport = async () => {
    const { data } = await insforge.database
      .from('expenses')
      .select('concept, amount, date, source')
      .gte('date', dateFrom)
      .lte('date', dateTo)
      .order('date', { ascending: false })
    setReportData(data || [])
  }

  const generateInventoryReport = async () => {
    const { data } = await insforge.database
      .from('inventory_movements')
      .select('type, quantity, reason, note, created_at, products:product_id(name), warehouses:warehouse_id(name)')
      .gte('created_at', dateFrom + 'T00:00:00')
      .lte('created_at', dateTo + 'T23:59:59')
      .order('created_at', { ascending: false })
    setReportData(data || [])
  }

  const generateCreditsReport = async () => {
    const { data } = await insforge.database
      .from('sales')
      .select('reference, total, total_paid, created_at, clients(name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    setReportData(data || [])
  }

  const generatePaymentsReport = async () => {
    const { data } = await insforge.database
      .from('payments')
      .select('reference, amount, payment_method, transfer_type, created_at, clients:client_id(name)')
      .gte('created_at', dateFrom + 'T00:00:00')
      .lte('created_at', dateTo + 'T23:59:59')
      .order('created_at', { ascending: false })
    setReportData(data || [])
  }

  const generateProductsReport = async () => {
    const { data } = await insforge.database
      .from('product_stock')
      .select('quantity, products(name, price), warehouses(name)')
      .order('quantity', { ascending: true })
    setReportData(data || [])
  }

  const generateCashReport = async () => {
    const { data } = await insforge.database
      .from('cash_registers')
      .select('*')
      .gte('opened_at', dateFrom + 'T00:00:00')
      .lte('opened_at', dateTo + 'T23:59:59')
      .order('opened_at', { ascending: false })
    setReportData(data || [])
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Reportes
        </h1>
        <p className="text-sm text-muted-foreground">Genera reportes del negocio</p>
      </div>

      {/* Report type selector */}
      <div className="flex flex-wrap gap-2">
        {reportTypes.map(rt => (
          <Button
            key={rt.key}
            variant={activeReport === rt.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setActiveReport(rt.key); setReportData(null) }}
          >
            <rt.icon className="h-4 w-4 mr-1" />
            {rt.label}
          </Button>
        ))}
      </div>

      {/* Date filters + generate */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="space-y-1 flex-1">
              <Label className="text-xs">{activeReport === 'daily' ? 'Fecha' : 'Desde'}</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            {activeReport !== 'daily' && activeReport !== 'credits' && (
              <div className="space-y-1 flex-1">
                <Label className="text-xs">Hasta</Label>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
            )}
            <Button onClick={generateReport} disabled={loading}>
              {loading ? <LoadingSpinner className="h-4 w-4 mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
              Generar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report content */}
      {reportData && (
        <Card>
          <CardContent className="pt-4">
            {activeReport === 'daily' && <DailyReportView data={reportData as DailyReport} />}
            {activeReport === 'sales' && <SalesReportView data={reportData as Record<string, unknown>[]} />}
            {activeReport === 'expenses' && <ExpensesReportView data={reportData as Record<string, unknown>[]} />}
            {activeReport === 'inventory' && <InventoryReportView data={reportData as Record<string, unknown>[]} />}
            {activeReport === 'credits' && <CreditsReportView data={reportData as Record<string, unknown>[]} />}
            {activeReport === 'payments' && <PaymentsReportView data={reportData as Record<string, unknown>[]} />}
            {activeReport === 'products' && <ProductsReportView data={reportData as Record<string, unknown>[]} />}
            {activeReport === 'cash' && <CashReportView data={reportData as Record<string, unknown>[]} />}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// --- Sub-components ---

function DailyReportView({ data }: { data: DailyReport }) {
  const chartData = [
    { name: 'Efectivo Ventas', value: data.sales.cash },
    { name: 'Transfer Ventas', value: data.sales.transfer },
    { name: 'Efectivo Abonos', value: data.credits.cash },
    { name: 'Transfer Abonos', value: data.credits.transfer },
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-6">
      {/* Summary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-success/10 border border-success/20">
          <p className="text-sm text-muted-foreground">Ingreso Total</p>
          <p className="text-2xl font-bold text-success">{formatCurrency(data.totalIncome)}</p>
        </div>
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-muted-foreground">Total Gastos</p>
          <p className="text-2xl font-bold text-destructive">{formatCurrency(data.expenses.total)}</p>
        </div>
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-sm text-muted-foreground">Ganancia Neta</p>
          <p className={`text-2xl font-bold ${data.totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
            {formatCurrency(data.totalProfit)}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-muted">
          <p className="text-sm text-muted-foreground">Ventas ({data.sales.count}) + Abonos ({data.credits.count})</p>
          <p className="text-lg font-bold">{formatCurrency(data.sales.total)} + {formatCurrency(data.credits.total)}</p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
            <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
              formatter={(value) => formatCurrency(value as number)}
            />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Detailed breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div>
          <h3 className="font-bold mb-2">Ventas</h3>
          <Table>
            <TableBody>
              <TableRow><TableCell>Efectivo</TableCell><TableCell className="text-right font-mono">{formatCurrency(data.sales.cash)}</TableCell></TableRow>
              <TableRow><TableCell>Transferencia</TableCell><TableCell className="text-right font-mono">{formatCurrency(data.sales.transfer)}</TableCell></TableRow>
              {data.sales.nequi > 0 && <TableRow><TableCell className="pl-8 text-sm">Nequi</TableCell><TableCell className="text-right font-mono text-sm">{formatCurrency(data.sales.nequi)}</TableCell></TableRow>}
              {data.sales.bancolombia > 0 && <TableRow><TableCell className="pl-8 text-sm">Bancolombia</TableCell><TableCell className="text-right font-mono text-sm">{formatCurrency(data.sales.bancolombia)}</TableCell></TableRow>}
              {data.sales.davivienda > 0 && <TableRow><TableCell className="pl-8 text-sm">Davivienda</TableCell><TableCell className="text-right font-mono text-sm">{formatCurrency(data.sales.davivienda)}</TableCell></TableRow>}
              <TableRow className="font-bold"><TableCell>Total</TableCell><TableCell className="text-right font-mono">{formatCurrency(data.sales.total)}</TableCell></TableRow>
            </TableBody>
          </Table>
        </div>

        <div>
          <h3 className="font-bold mb-2">Abonos</h3>
          <Table>
            <TableBody>
              <TableRow><TableCell>Efectivo</TableCell><TableCell className="text-right font-mono">{formatCurrency(data.credits.cash)}</TableCell></TableRow>
              <TableRow><TableCell>Transferencia</TableCell><TableCell className="text-right font-mono">{formatCurrency(data.credits.transfer)}</TableCell></TableRow>
              {data.credits.nequi > 0 && <TableRow><TableCell className="pl-8 text-sm">Nequi</TableCell><TableCell className="text-right font-mono text-sm">{formatCurrency(data.credits.nequi)}</TableCell></TableRow>}
              {data.credits.bancolombia > 0 && <TableRow><TableCell className="pl-8 text-sm">Bancolombia</TableCell><TableCell className="text-right font-mono text-sm">{formatCurrency(data.credits.bancolombia)}</TableCell></TableRow>}
              {data.credits.davivienda > 0 && <TableRow><TableCell className="pl-8 text-sm">Davivienda</TableCell><TableCell className="text-right font-mono text-sm">{formatCurrency(data.credits.davivienda)}</TableCell></TableRow>}
              <TableRow className="font-bold"><TableCell>Total</TableCell><TableCell className="text-right font-mono">{formatCurrency(data.credits.total)}</TableCell></TableRow>
            </TableBody>
          </Table>
        </div>

        <div>
          <h3 className="font-bold mb-2">Consolidado</h3>
          <Table>
            <TableBody>
              <TableRow><TableCell>Efectivo Total</TableCell><TableCell className="text-right font-mono">{formatCurrency(data.consolidated.totalCash)}</TableCell></TableRow>
              <TableRow><TableCell>Transferencia Total</TableCell><TableCell className="text-right font-mono">{formatCurrency(data.consolidated.totalTransfer)}</TableCell></TableRow>
              {data.consolidated.totalNequi > 0 && <TableRow><TableCell className="pl-8 text-sm">Nequi</TableCell><TableCell className="text-right font-mono text-sm">{formatCurrency(data.consolidated.totalNequi)}</TableCell></TableRow>}
              {data.consolidated.totalBancolombia > 0 && <TableRow><TableCell className="pl-8 text-sm">Bancolombia</TableCell><TableCell className="text-right font-mono text-sm">{formatCurrency(data.consolidated.totalBancolombia)}</TableCell></TableRow>}
              {data.consolidated.totalDavivienda > 0 && <TableRow><TableCell className="pl-8 text-sm">Davivienda</TableCell><TableCell className="text-right font-mono text-sm">{formatCurrency(data.consolidated.totalDavivienda)}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

function SalesReportView({ data }: { data: Record<string, unknown>[] }) {
  const total = data.reduce((s, d) => s + (d.total as number), 0)
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{data.length} ventas - Total: <span className="font-bold text-foreground">{formatCurrency(total)}</span></p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Metodo</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Origen</TableHead>
            <TableHead>Fecha</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((s, i) => (
            <TableRow key={i}>
              <TableCell>{(s.clients as { name: string } | null)?.name || '-'}</TableCell>
              <TableCell className="font-mono">{formatCurrency(s.total as number)}</TableCell>
              <TableCell><Badge variant="outline">{PAYMENT_METHODS[s.payment_method as keyof typeof PAYMENT_METHODS]}{s.transfer_type ? ` (${TRANSFER_TYPES[s.transfer_type as keyof typeof TRANSFER_TYPES]})` : ''}</Badge></TableCell>
              <TableCell><Badge variant={s.status === 'completed' ? 'success' : 'warning'}>{s.status === 'completed' ? 'Completada' : 'Pendiente'}</Badge></TableCell>
              <TableCell><Badge variant="secondary">{s.source === 'pos' ? 'POS' : 'Manual'}</Badge></TableCell>
              <TableCell className="text-xs">{formatDateTime(s.created_at as string)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function ExpensesReportView({ data }: { data: Record<string, unknown>[] }) {
  const total = data.reduce((s, d) => s + (d.amount as number), 0)
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{data.length} gastos - Total: <span className="font-bold text-destructive">{formatCurrency(total)}</span></p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Concepto</TableHead>
            <TableHead>Monto</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Origen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((e, i) => (
            <TableRow key={i}>
              <TableCell>{e.concept as string}</TableCell>
              <TableCell className="font-mono text-destructive">{formatCurrency(e.amount as number)}</TableCell>
              <TableCell className="text-sm">{e.date as string}</TableCell>
              <TableCell><Badge variant="secondary">{e.source === 'pos' ? 'POS' : 'Manual'}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function InventoryReportView({ data }: { data: Record<string, unknown>[] }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{data.length} movimientos</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo</TableHead>
            <TableHead>Producto</TableHead>
            <TableHead>Bodega</TableHead>
            <TableHead>Cantidad</TableHead>
            <TableHead>Razon</TableHead>
            <TableHead>Fecha</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((m, i) => (
            <TableRow key={i}>
              <TableCell>{INVENTORY_TYPES[m.type as keyof typeof INVENTORY_TYPES]}</TableCell>
              <TableCell>{(m.products as { name: string } | null)?.name || '-'}</TableCell>
              <TableCell>{(m.warehouses as { name: string } | null)?.name || '-'}</TableCell>
              <TableCell className="font-mono">{formatQuantity(m.quantity as number)}</TableCell>
              <TableCell className="text-sm">{m.reason ? EXIT_REASONS[m.reason as keyof typeof EXIT_REASONS] || (m.reason as string) : '-'}</TableCell>
              <TableCell className="text-xs">{formatDateTime(m.created_at as string)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function CreditsReportView({ data }: { data: Record<string, unknown>[] }) {
  const totalDebt = data.reduce((s, d) => s + ((d.total as number) - (d.total_paid as number)), 0)
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{data.length} creditos pendientes - Deuda total: <span className="font-bold text-destructive">{formatCurrency(totalDebt)}</span></p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Referencia</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Pagado</TableHead>
            <TableHead>Pendiente</TableHead>
            <TableHead>Dias</TableHead>
            <TableHead>Fecha</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((c, i) => {
            const debt = (c.total as number) - (c.total_paid as number)
            const days = Math.floor((Date.now() - new Date(c.created_at as string).getTime()) / (1000 * 60 * 60 * 24))
            return (
              <TableRow key={i}>
                <TableCell className="font-mono text-xs">{c.reference as string}</TableCell>
                <TableCell>{(c.clients as { name: string } | null)?.name || '-'}</TableCell>
                <TableCell className="font-mono">{formatCurrency(c.total as number)}</TableCell>
                <TableCell className="font-mono text-success">{formatCurrency(c.total_paid as number)}</TableCell>
                <TableCell className="font-mono text-destructive">{formatCurrency(debt)}</TableCell>
                <TableCell><Badge variant={days > 30 ? 'destructive' : days > 15 ? 'warning' : 'secondary'}>{days}d</Badge></TableCell>
                <TableCell className="text-xs">{formatDateTime(c.created_at as string)}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function PaymentsReportView({ data }: { data: Record<string, unknown>[] }) {
  const total = data.reduce((s, d) => s + (d.amount as number), 0)
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{data.length} pagos - Total: <span className="font-bold text-success">{formatCurrency(total)}</span></p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Referencia</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Monto</TableHead>
            <TableHead>Metodo</TableHead>
            <TableHead>Fecha</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((p, i) => (
            <TableRow key={i}>
              <TableCell className="font-mono text-xs">{p.reference as string}</TableCell>
              <TableCell>{(p.clients as { name: string } | null)?.name || '-'}</TableCell>
              <TableCell className="font-mono text-success">{formatCurrency(p.amount as number)}</TableCell>
              <TableCell><Badge variant="outline">{PAYMENT_METHODS[p.payment_method as keyof typeof PAYMENT_METHODS]}{p.transfer_type ? ` (${TRANSFER_TYPES[p.transfer_type as keyof typeof TRANSFER_TYPES]})` : ''}</Badge></TableCell>
              <TableCell className="text-xs">{formatDateTime(p.created_at as string)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function ProductsReportView({ data }: { data: Record<string, unknown>[] }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{data.length} registros de stock</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead>Bodega</TableHead>
            <TableHead>Precio</TableHead>
            <TableHead className="text-right">Stock</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((s, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium">{(s.products as { name: string; price: number } | null)?.name || '-'}</TableCell>
              <TableCell>{(s.warehouses as { name: string } | null)?.name || '-'}</TableCell>
              <TableCell className="font-mono">{formatCurrency((s.products as { price: number } | null)?.price || 0)}</TableCell>
              <TableCell className="text-right">
                <Badge variant={(s.quantity as number) <= 0 ? 'destructive' : (s.quantity as number) < 10 ? 'warning' : 'secondary'}>
                  {formatQuantity(s.quantity as number)}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function CashReportView({ data }: { data: Record<string, unknown>[] }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{data.length} sesiones de caja</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Referencia</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Inicial</TableHead>
            <TableHead>Ventas</TableHead>
            <TableHead>Gastos</TableHead>
            <TableHead>Final</TableHead>
            <TableHead>Apertura</TableHead>
            <TableHead>Cierre</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((r, i) => (
            <TableRow key={i}>
              <TableCell className="font-mono text-xs">{r.reference as string}</TableCell>
              <TableCell><Badge variant={r.status === 'open' ? 'success' : 'secondary'}>{r.status === 'open' ? 'Abierta' : 'Cerrada'}</Badge></TableCell>
              <TableCell className="font-mono">{formatCurrency(r.initial_amount as number)}</TableCell>
              <TableCell className="font-mono text-success">{formatCurrency(r.total_sales as number)}</TableCell>
              <TableCell className="font-mono text-destructive">{formatCurrency(r.total_expenses as number)}</TableCell>
              <TableCell className="font-mono font-bold">{r.final_amount !== null ? formatCurrency(r.final_amount as number) : '-'}</TableCell>
              <TableCell className="text-xs">{formatDateTime(r.opened_at as string)}</TableCell>
              <TableCell className="text-xs">{r.closed_at ? formatDateTime(r.closed_at as string) : '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
