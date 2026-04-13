import { useState, useEffect, useCallback } from 'react'
import { insforge } from '@/lib/insforge'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDateTime, formatQuantity, getFirstDayOfMonth, getLastDayOfMonth } from '@/lib/utils'
import { PAYMENT_METHODS, TRANSFER_TYPES, ITEMS_PER_PAGE } from '@/lib/constants'
import type { Sale, SaleItem, Client, Product } from '@/types'
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
import { Pagination } from '@/components/ui/pagination'
import { PageLoading } from '@/components/ui/loading'
import { Receipt, Search, Eye, Trash2, Plus, DollarSign, ShoppingCart } from 'lucide-react'

interface ManualItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
}

export function SalesPage() {
  const { isAdmin } = useAuth()
  const { showToast } = useToast()
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState(getFirstDayOfMonth())
  const [dateTo, setDateTo] = useState(getLastDayOfMonth())
  const [filterMethod, setFilterMethod] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)

  // Detail
  const [detailSale, setDetailSale] = useState<(Sale & { items: SaleItem[] }) | null>(null)

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Sale | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Manual sale dialog
  const [manualOpen, setManualOpen] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [manualClient, setManualClient] = useState('')
  const [manualMethod, setManualMethod] = useState<'cash' | 'transfer' | 'credit'>('cash')
  const [manualTransfer, setManualTransfer] = useState<'nequi' | 'bancolombia' | 'davivienda'>('nequi')
  const [manualNote, setManualNote] = useState('')
  const [manualItems, setManualItems] = useState<ManualItem[]>([])
  const [addProductId, setAddProductId] = useState('')
  const [addQuantity, setAddQuantity] = useState('1')
  const [addPrice, setAddPrice] = useState('')
  const [savingSale, setSavingSale] = useState(false)

  const fetchSales = useCallback(async () => {
    const from = (page - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1

    let query = insforge.database
      .from('sales')
      .select('*, clients(name)', { count: 'exact' })
      .gte('created_at', dateFrom + 'T00:00:00')
      .lte('created_at', dateTo + 'T23:59:59')
      .order('created_at', { ascending: false })
      .range(from, to)

    if (search) {
      query = query.ilike('reference', `%${search}%`)
    }
    if (filterMethod) {
      query = query.eq('payment_method', filterMethod)
    }
    if (filterStatus) {
      query = query.eq('status', filterStatus)
    }

    const { data, error, count } = await query
    if (error) {
      showToast('Error cargando ventas', 'danger')
      return
    }

    const mapped = ((data || []) as Record<string, unknown>[]).map(s => ({
      ...s,
      client_name: (s.clients as { name: string } | null)?.name || null,
    })) as Sale[]

    setSales(mapped)
    setTotal(count || 0)

    // Get total
    let totalQuery = insforge.database
      .from('sales')
      .select('total')
      .gte('created_at', dateFrom + 'T00:00:00')
      .lte('created_at', dateTo + 'T23:59:59')
    if (filterMethod) totalQuery = totalQuery.eq('payment_method', filterMethod)
    if (filterStatus) totalQuery = totalQuery.eq('status', filterStatus)
    const { data: allData } = await totalQuery
    const sum = ((allData || []) as { total: number }[]).reduce((s, e) => s + e.total, 0)
    setTotalAmount(sum)
    setLoading(false)
  }, [page, search, dateFrom, dateTo, filterMethod, filterStatus, showToast])

  useEffect(() => {
    fetchSales()
  }, [fetchSales])

  const fetchDetail = async (sale: Sale) => {
    const { data } = await insforge.database
      .from('sale_items')
      .select('*')
      .eq('sale_id', sale.id)
    setDetailSale({ ...sale, items: (data as SaleItem[]) || [] })
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const { error } = await insforge.database.rpc('reverse_sale', { p_sale_id: deleteTarget.id })
      if (error) throw error
      showToast('Venta eliminada y stock restaurado', 'success')
      setDeleteTarget(null)
      fetchSales()
    } catch {
      showToast('Error eliminando venta', 'danger')
    } finally {
      setDeleting(false)
    }
  }

  // Manual sale helpers
  const openManualSale = async () => {
    const [{ data: cData }, { data: pData }] = await Promise.all([
      insforge.database.from('clients').select().order('name', { ascending: true }),
      insforge.database.from('products').select().order('name', { ascending: true }),
    ])
    setClients((cData as Client[]) || [])
    setProducts((pData as Product[]) || [])
    setManualClient('')
    setManualMethod('cash')
    setManualTransfer('nequi')
    setManualNote('')
    setManualItems([])
    setAddProductId('')
    setAddQuantity('1')
    setAddPrice('')
    setManualOpen(true)
  }

  const addItemToSale = () => {
    const prod = products.find(p => p.id === addProductId)
    if (!prod) {
      showToast('Seleccione un producto', 'warning')
      return
    }
    const qty = parseFloat(addQuantity)
    if (isNaN(qty) || qty <= 0) {
      showToast('Cantidad invalida', 'warning')
      return
    }
    // Validate half-quantity
    const dec = qty - Math.floor(qty)
    if (dec !== 0 && Math.abs(dec - 0.5) > 0.001) {
      showToast('Solo cantidades enteras o .5', 'warning')
      return
    }
    const price = addPrice ? parseInt(addPrice, 10) : prod.price
    if (isNaN(price) || price < 0) {
      showToast('Precio invalido', 'warning')
      return
    }

    setManualItems(prev => {
      const existing = prev.find(i => i.product_id === prod.id && i.unit_price === price)
      if (existing) {
        return prev.map(i =>
          i.product_id === prod.id && i.unit_price === price
            ? { ...i, quantity: i.quantity + qty }
            : i
        )
      }
      return [...prev, {
        product_id: prod.id,
        product_name: prod.name,
        quantity: qty,
        unit_price: price,
      }]
    })
    setAddProductId('')
    setAddQuantity('1')
    setAddPrice('')
  }

  const removeItem = (idx: number) => {
    setManualItems(prev => prev.filter((_, i) => i !== idx))
  }

  const manualTotal = manualItems.reduce((s, i) => s + Math.round(i.quantity * i.unit_price), 0)

  const handleManualSale = async () => {
    if (manualItems.length === 0) {
      showToast('Agregue al menos un producto', 'warning')
      return
    }
    if (manualMethod === 'credit' && !manualClient) {
      showToast('Seleccione un cliente para credito', 'warning')
      return
    }
    setSavingSale(true)
    try {
      const items = manualItems.map(i => ({
        product_id: i.product_id,
        product_name: i.product_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
      }))

      const { error } = await insforge.database.rpc('process_manual_sale', {
        p_client_id: manualClient || null,
        p_items: items,
        p_payment_method: manualMethod,
        p_transfer_type: manualMethod === 'transfer' ? manualTransfer : null,
        p_received: manualMethod === 'cash' ? manualTotal : 0,
        p_note: manualNote.trim() || null,
      })
      if (error) throw error
      showToast('Venta registrada exitosamente', 'success')
      setManualOpen(false)
      fetchSales()
    } catch (err) {
      showToast((err as Error).message || 'Error registrando venta', 'danger')
    } finally {
      setSavingSale(false)
    }
  }

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)
  const methodLabel = (m: string) => PAYMENT_METHODS[m as keyof typeof PAYMENT_METHODS] || m
  const transferLabel = (t: string | null) => t ? TRANSFER_TYPES[t as keyof typeof TRANSFER_TYPES] || t : ''

  if (loading) return <PageLoading />

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" />
            Ventas
          </h1>
          <p className="text-sm text-muted-foreground">{total} ventas en el periodo</p>
        </div>
        <Button onClick={openManualSale}>
          <Plus className="h-4 w-4 mr-2" />
          Venta Manual
        </Button>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Ventas del Periodo</p>
              <p className="text-xl font-bold text-success">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative lg:col-span-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar ref..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                className="pl-9"
              />
            </div>
            <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }} />
            <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }} />
            <Select value={filterMethod} onChange={e => { setFilterMethod(e.target.value); setPage(1) }}>
              <option value="">Todos los metodos</option>
              {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
            <Select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}>
              <option value="">Todos los estados</option>
              <option value="completed">Completada</option>
              <option value="pending">Pendiente</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Registro de Ventas</CardTitle>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay ventas en este periodo</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referencia</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Metodo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="w-24">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.reference}</TableCell>
                      <TableCell>{s.client_name || '-'}</TableCell>
                      <TableCell className="font-mono font-bold">{formatCurrency(s.total)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {methodLabel(s.payment_method)}
                          {s.transfer_type && ` (${transferLabel(s.transfer_type)})`}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.status === 'completed' ? 'success' : 'warning'}>
                          {s.status === 'completed' ? 'Completada' : 'Pendiente'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.source === 'pos' ? 'default' : 'secondary'}>
                          {s.source === 'pos' ? 'POS' : 'Manual'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(s.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => fetchDetail(s)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(s)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
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

      {/* Sale Detail Dialog */}
      <Dialog open={!!detailSale} onOpenChange={open => !open && setDetailSale(null)}>
        <DialogHeader>
          <DialogTitle>Detalle de Venta</DialogTitle>
        </DialogHeader>
        {detailSale && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Referencia</p>
                <p className="font-mono">{detailSale.reference}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p>{detailSale.client_name || 'Sin cliente'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Metodo</p>
                <p>{methodLabel(detailSale.payment_method)}{detailSale.transfer_type ? ` (${transferLabel(detailSale.transfer_type)})` : ''}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <Badge variant={detailSale.status === 'completed' ? 'success' : 'warning'}>
                  {detailSale.status === 'completed' ? 'Completada' : 'Pendiente'}
                </Badge>
              </div>
            </div>
            {detailSale.items.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Cant.</TableHead>
                    <TableHead className="text-right">P. Unit.</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailSale.items.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>{item.product_name}</TableCell>
                      <TableCell className="text-right font-mono">{formatQuantity(item.quantity)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(item.subtotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <div className="border-t pt-4 flex justify-between items-center">
              <span className="text-lg font-bold">Total</span>
              <span className="text-lg font-bold">{formatCurrency(detailSale.total)}</span>
            </div>
            {detailSale.status === 'pending' && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Pagado</span>
                <span>{formatCurrency(detailSale.total_paid)} / {formatCurrency(detailSale.total)}</span>
              </div>
            )}
            {detailSale.note && (
              <div>
                <p className="text-sm text-muted-foreground">Nota</p>
                <p className="text-sm">{detailSale.note}</p>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setDetailSale(null)}>Cerrar</Button>
        </DialogFooter>
      </Dialog>

      {/* Manual Sale Dialog */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogHeader>
          <DialogTitle>
            <span className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Venta Manual
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[60vh] overflow-auto">
          {/* Add product */}
          <div className="space-y-2 border rounded-md p-3">
            <Label className="text-sm font-medium">Agregar Producto</Label>
            <div className="grid grid-cols-2 gap-2">
              <Select value={addProductId} onChange={e => {
                setAddProductId(e.target.value)
                const prod = products.find(p => p.id === e.target.value)
                if (prod) setAddPrice(String(prod.price))
              }}>
                <option value="">Seleccionar...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.price)}</option>
                ))}
              </Select>
              <div className="flex gap-2">
                <Input type="number" value={addQuantity} onChange={e => setAddQuantity(e.target.value)} placeholder="Cant" min={0.5} step={0.5} className="w-20" />
                <Input type="number" value={addPrice} onChange={e => setAddPrice(e.target.value)} placeholder="Precio" className="w-28" />
                <Button size="sm" onClick={addItemToSale}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Items */}
          {manualItems.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Cant.</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {manualItems.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-sm">{item.product_name}</TableCell>
                    <TableCell className="text-right font-mono">{formatQuantity(item.quantity)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(item.unit_price)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(Math.round(item.quantity * item.unit_price))}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="flex justify-between items-center font-bold text-lg border-t pt-3">
            <span>Total</span>
            <span>{formatCurrency(manualTotal)}</span>
          </div>

          {/* Payment options */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={manualClient} onChange={e => setManualClient(e.target.value)}>
                <option value="">Sin cliente</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Metodo de Pago</Label>
              <Select value={manualMethod} onChange={e => setManualMethod(e.target.value as 'cash' | 'transfer' | 'credit')}>
                {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </div>
          </div>

          {manualMethod === 'transfer' && (
            <div className="space-y-2">
              <Label>Tipo de Transferencia</Label>
              <Select value={manualTransfer} onChange={e => setManualTransfer(e.target.value as 'nequi' | 'bancolombia' | 'davivienda')}>
                {Object.entries(TRANSFER_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Nota</Label>
            <Textarea value={manualNote} onChange={e => setManualNote(e.target.value)} placeholder="Nota opcional" rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setManualOpen(false)}>Cancelar</Button>
          <Button onClick={handleManualSale} disabled={savingSale || manualItems.length === 0}>
            {savingSale ? 'Registrando...' : `Registrar Venta (${formatCurrency(manualTotal)})`}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        title="Eliminar Venta"
        description={`Esta seguro de eliminar la venta ${deleteTarget?.reference}? Se restaurara el stock.`}
        confirmText={deleting ? 'Eliminando...' : 'Eliminar'}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
