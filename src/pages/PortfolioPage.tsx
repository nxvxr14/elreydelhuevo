import { useState, useEffect, useCallback } from 'react'
import { insforge } from '@/lib/insforge'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { PAYMENT_METHODS, TRANSFER_TYPES } from '@/lib/constants'
import type { Client, Sale, Payment } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { PageLoading } from '@/components/ui/loading'
import { CreditCard, Search, DollarSign, Trash2, AlertTriangle } from 'lucide-react'

interface ClientDebt {
  client: Client
  totalDebt: number
  salesCount: number
  oldestDays: number
  pendingSales: Sale[]
}

export function PortfolioPage() {
  const { isAdmin } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [clientDebts, setClientDebts] = useState<ClientDebt[]>([])
  const [totalDebt, setTotalDebt] = useState(0)

  // Payment dialog
  const [payClient, setPayClient] = useState<ClientDebt | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState<'cash' | 'transfer'>('cash')
  const [payTransfer, setPayTransfer] = useState<'nequi' | 'bancolombia' | 'davivienda'>('nequi')
  const [payNote, setPayNote] = useState('')
  const [paying, setPaying] = useState(false)

  // Payment history
  const [historyClient, setHistoryClient] = useState<Client | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])

  // Delete payment
  const [deletePayment, setDeletePayment] = useState<Payment | null>(null)
  const [deletingPayment, setDeletingPayment] = useState(false)

  const fetchDebts = useCallback(async () => {
    // Get all pending sales grouped by client
    const { data: sales, error } = await insforge.database
      .from('sales')
      .select('*, clients(id, name, phone, address, note)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (error) {
      showToast('Error cargando cartera', 'danger')
      return
    }

    const clientMap = new Map<string, ClientDebt>()
    for (const s of (sales || []) as Record<string, unknown>[]) {
      const sale = s as unknown as Sale & { clients: Client | null }
      const clientId = sale.client_id
      if (!clientId || !sale.clients) continue

      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, {
          client: sale.clients,
          totalDebt: 0,
          salesCount: 0,
          oldestDays: 0,
          pendingSales: [],
        })
      }
      const entry = clientMap.get(clientId)!
      const debt = sale.total - sale.total_paid
      entry.totalDebt += debt
      entry.salesCount++
      entry.pendingSales.push(sale)
      const days = Math.floor((Date.now() - new Date(sale.created_at).getTime()) / (1000 * 60 * 60 * 24))
      if (days > entry.oldestDays) entry.oldestDays = days
    }

    const debts = Array.from(clientMap.values()).sort((a, b) => b.totalDebt - a.totalDebt)
    setClientDebts(debts)
    setTotalDebt(debts.reduce((s, d) => s + d.totalDebt, 0))
    setLoading(false)
  }, [showToast])

  useEffect(() => {
    fetchDebts()
  }, [fetchDebts])

  const openPayment = (cd: ClientDebt) => {
    setPayClient(cd)
    setPayAmount(String(Math.round(cd.totalDebt)))
    setPayMethod('cash')
    setPayTransfer('nequi')
    setPayNote('')
  }

  const handlePayment = async () => {
    if (!payClient) return
    const amount = parseInt(payAmount, 10)
    if (isNaN(amount) || amount <= 0) {
      showToast('El monto debe ser mayor a 0', 'warning')
      return
    }
    if (amount > Math.round(payClient.totalDebt)) {
      showToast('El monto excede la deuda total', 'warning')
      return
    }
    setPaying(true)
    try {
      const { error } = await insforge.database.rpc('process_credit_payment', {
        p_client_id: payClient.client.id,
        p_amount: Math.round(amount),
        p_payment_method: payMethod,
        p_transfer_type: payMethod === 'transfer' ? payTransfer : null,
        p_note: payNote.trim() || null,
      })
      if (error) throw error
      showToast('Abono registrado exitosamente', 'success')
      setPayClient(null)
      fetchDebts()
    } catch (err) {
      showToast((err as Error).message || 'Error registrando abono', 'danger')
    } finally {
      setPaying(false)
    }
  }

  const showHistory = async (client: Client) => {
    const { data } = await insforge.database
      .from('payments')
      .select('*')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setHistoryClient(client)
    setPayments((data as Payment[]) || [])
  }

  const handleDeletePayment = async () => {
    if (!deletePayment) return
    setDeletingPayment(true)
    try {
      const { error } = await insforge.database.rpc('reverse_payment', { p_payment_id: deletePayment.id })
      if (error) throw error
      showToast('Pago eliminado y deuda restaurada', 'success')
      setDeletePayment(null)
      // Refresh history
      if (historyClient) showHistory(historyClient)
      fetchDebts()
    } catch {
      showToast('Error eliminando pago', 'danger')
    } finally {
      setDeletingPayment(false)
    }
  }

  const filtered = clientDebts.filter(cd =>
    cd.client.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <PageLoading />

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" />
          Cartera
        </h1>
        <p className="text-sm text-muted-foreground">{clientDebts.length} clientes con creditos pendientes</p>
      </div>

      {/* Summary */}
      <Card className="border-warning/50">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Deuda Total Pendiente</p>
              <p className="text-xl font-bold text-warning">{formatCurrency(totalDebt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardContent className="pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Client list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="pt-6 pb-6">
            <p className="text-center text-muted-foreground">
              {search ? 'No se encontraron clientes' : 'No hay creditos pendientes'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(cd => (
            <Card key={cd.client.id}>
              <CardContent className="pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg">{cd.client.name}</h3>
                      {cd.oldestDays > 30 && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {cd.oldestDays}d
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>{cd.salesCount} ventas pendientes</span>
                      <span>Deuda mas antigua: {cd.oldestDays} dias</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-destructive">{formatCurrency(cd.totalDebt)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => openPayment(cd)}>
                      <DollarSign className="h-4 w-4 mr-1" />
                      Abonar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => showHistory(cd.client)}>
                      Historial
                    </Button>
                  </div>
                </div>

                {/* Pending sales list */}
                <div className="mt-3 border-t pt-3">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Referencia</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Pagado</TableHead>
                        <TableHead>Pendiente</TableHead>
                        <TableHead>Fecha</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cd.pendingSales.map(s => (
                        <TableRow key={s.id}>
                          <TableCell className="font-mono text-xs">{s.reference}</TableCell>
                          <TableCell className="font-mono">{formatCurrency(s.total)}</TableCell>
                          <TableCell className="font-mono text-success">{formatCurrency(s.total_paid)}</TableCell>
                          <TableCell className="font-mono text-destructive">{formatCurrency(s.total - s.total_paid)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDateTime(s.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Payment Dialog */}
      <Dialog open={!!payClient} onOpenChange={open => !open && setPayClient(null)}>
        <DialogHeader>
          <DialogTitle>Registrar Abono - {payClient?.client.name}</DialogTitle>
        </DialogHeader>
        {payClient && (
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-md bg-muted">
              <p className="text-sm text-muted-foreground">Deuda total</p>
              <p className="text-lg font-bold text-destructive">{formatCurrency(payClient.totalDebt)}</p>
            </div>
            <div className="space-y-2">
              <Label>Monto del Abono *</Label>
              <Input
                type="number"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                max={Math.round(payClient.totalDebt)}
                min={1}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Metodo de Pago</Label>
              <Select value={payMethod} onChange={e => setPayMethod(e.target.value as 'cash' | 'transfer')}>
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
              </Select>
            </div>
            {payMethod === 'transfer' && (
              <div className="space-y-2">
                <Label>Tipo de Transferencia</Label>
                <Select value={payTransfer} onChange={e => setPayTransfer(e.target.value as 'nequi' | 'bancolombia' | 'davivienda')}>
                  {Object.entries(TRANSFER_TYPES).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Nota</Label>
              <Textarea value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="Nota opcional" rows={2} />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setPayClient(null)}>Cancelar</Button>
          <Button onClick={handlePayment} disabled={paying}>
            {paying ? 'Registrando...' : 'Registrar Abono'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Payment History Dialog */}
      <Dialog open={!!historyClient} onOpenChange={open => !open && setHistoryClient(null)}>
        <DialogHeader>
          <DialogTitle>Historial de Pagos - {historyClient?.name}</DialogTitle>
        </DialogHeader>
        <div className="py-4 max-h-[60vh] overflow-auto">
          {payments.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No hay pagos registrados</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Metodo</TableHead>
                  <TableHead>Fecha</TableHead>
                  {isAdmin && <TableHead className="w-16"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.reference}</TableCell>
                    <TableCell className="font-mono text-success">{formatCurrency(p.amount)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {PAYMENT_METHODS[p.payment_method as keyof typeof PAYMENT_METHODS]}
                        {p.transfer_type && ` (${TRANSFER_TYPES[p.transfer_type]})`}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(p.created_at)}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setDeletePayment(p)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setHistoryClient(null)}>Cerrar</Button>
        </DialogFooter>
      </Dialog>

      {/* Delete Payment Confirm */}
      <ConfirmDialog
        open={!!deletePayment}
        onOpenChange={open => !open && setDeletePayment(null)}
        title="Eliminar Pago"
        description={`Eliminar pago ${deletePayment?.reference} de ${deletePayment ? formatCurrency(deletePayment.amount) : ''}? Se restaurara la deuda.`}
        confirmText={deletingPayment ? 'Eliminando...' : 'Eliminar'}
        variant="destructive"
        onConfirm={handleDeletePayment}
      />
    </div>
  )
}
