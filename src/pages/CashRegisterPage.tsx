import { useState, useEffect, useCallback } from 'react'
import { insforge } from '@/lib/insforge'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { CashRegister } from '@/types'
import { ITEMS_PER_PAGE } from '@/lib/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { PageLoading } from '@/components/ui/loading'
import { DollarSign, Clock, TrendingUp, TrendingDown, Eye } from 'lucide-react'

export function CashRegisterPage() {
  const { showToast } = useToast()
  const [registers, setRegisters] = useState<CashRegister[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  // Detail
  const [detail, setDetail] = useState<CashRegister | null>(null)

  const fetchRegisters = useCallback(async () => {
    const from = (page - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1

    const { data, error, count } = await insforge.database
      .from('cash_registers')
      .select('*', { count: 'exact' })
      .order('opened_at', { ascending: false })
      .range(from, to)

    if (error) {
      showToast('Error cargando caja registradora', 'danger')
      return
    }
    setRegisters((data as CashRegister[]) || [])
    setTotal(count || 0)
    setLoading(false)
  }, [page, showToast])

  useEffect(() => {
    fetchRegisters()
  }, [fetchRegisters])

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

  // Current open register
  const openRegister = registers.find(r => r.status === 'open')

  if (loading) return <PageLoading />

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            Caja Registradora
          </h1>
          <p className="text-sm text-muted-foreground">Historial de sesiones de caja</p>
        </div>
      </div>

      {/* Current status */}
      {openRegister ? (
        <Card className="border-success/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-success" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Caja Abierta</p>
                <p className="font-medium">Ref: {openRegister.reference}</p>
                <p className="text-xs text-muted-foreground">Abierta: {formatDateTime(openRegister.opened_at)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Monto Inicial</p>
                <p className="font-bold">{formatCurrency(openRegister.initial_amount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-muted">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sin caja abierta</p>
                <p className="text-xs text-muted-foreground">Abre una caja desde el Punto de Venta para registrar ventas y gastos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historial de Cajas</CardTitle>
        </CardHeader>
        <CardContent>
          {registers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay registros de caja</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referencia</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Monto Inicial</TableHead>
                    <TableHead>Ventas</TableHead>
                    <TableHead>Gastos</TableHead>
                    <TableHead>Monto Final</TableHead>
                    <TableHead>Apertura</TableHead>
                    <TableHead className="w-20">Detalle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registers.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.reference}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === 'open' ? 'success' : 'secondary'}>
                          {r.status === 'open' ? 'Abierta' : 'Cerrada'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{formatCurrency(r.initial_amount)}</TableCell>
                      <TableCell className="font-mono text-success">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {formatCurrency(r.total_sales)}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-destructive">
                        <span className="flex items-center gap-1">
                          <TrendingDown className="h-3 w-3" />
                          {formatCurrency(r.total_expenses)}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono font-bold">
                        {r.final_amount !== null ? formatCurrency(r.final_amount) : '-'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(r.opened_at)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setDetail(r)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={open => !open && setDetail(null)}>
        <DialogHeader>
          <DialogTitle>Detalle de Caja</DialogTitle>
        </DialogHeader>
        {detail && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Referencia</p>
                <p className="font-mono">{detail.reference}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <Badge variant={detail.status === 'open' ? 'success' : 'secondary'}>
                  {detail.status === 'open' ? 'Abierta' : 'Cerrada'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monto Inicial</p>
                <p className="font-bold">{formatCurrency(detail.initial_amount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Ventas</p>
                <p className="font-bold text-success">{formatCurrency(detail.total_sales)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Gastos</p>
                <p className="font-bold text-destructive">{formatCurrency(detail.total_expenses)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monto Final</p>
                <p className="font-bold text-lg">
                  {detail.final_amount !== null ? formatCurrency(detail.final_amount) : '-'}
                </p>
              </div>
            </div>
            <div className="border-t pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Apertura</p>
                  <p className="text-sm">{formatDateTime(detail.opened_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cierre</p>
                  <p className="text-sm">{detail.closed_at ? formatDateTime(detail.closed_at) : 'Pendiente'}</p>
                </div>
              </div>
            </div>
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground">Balance Esperado</p>
              <p className="font-bold text-lg">
                {formatCurrency(detail.initial_amount + detail.total_sales - detail.total_expenses)}
              </p>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setDetail(null)}>Cerrar</Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
