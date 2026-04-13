import { useState, useEffect, useCallback } from 'react'
import { insforge } from '@/lib/insforge'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/contexts/AuthContext'
import { formatQuantity, formatDateTime, isValidQuantity } from '@/lib/utils'
import { INVENTORY_TYPES, EXIT_REASONS, ITEMS_PER_PAGE } from '@/lib/constants'
import type { InventoryMovement, Product, Warehouse } from '@/types'
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
import { ArrowLeftRight, Plus, Trash2, Search, ArrowDown, ArrowUp, Repeat, RefreshCw } from 'lucide-react'

type MovementType = 'entry' | 'exit' | 'transfer' | 'exchange'

const typeIcons: Record<MovementType, typeof ArrowDown> = {
  entry: ArrowDown,
  exit: ArrowUp,
  transfer: ArrowLeftRight,
  exchange: RefreshCw,
}

const typeColors: Record<MovementType, string> = {
  entry: 'text-success',
  exit: 'text-destructive',
  transfer: 'text-primary',
  exchange: 'text-warning',
}

export function InventoryPage() {
  const { isAdmin } = useAuth()
  const { showToast } = useToast()
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  // Shared data
  const [products, setProducts] = useState<Product[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])

  // Movement dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [movementType, setMovementType] = useState<MovementType>('entry')
  const [formProduct, setFormProduct] = useState('')
  const [formWarehouse, setFormWarehouse] = useState('')
  const [formQuantity, setFormQuantity] = useState('')
  const [formReason, setFormReason] = useState('')
  const [formNote, setFormNote] = useState('')
  // Transfer
  const [formFromWarehouse, setFormFromWarehouse] = useState('')
  const [formToWarehouse, setFormToWarehouse] = useState('')
  // Exchange
  const [formSourceProduct, setFormSourceProduct] = useState('')
  const [formTargetProduct, setFormTargetProduct] = useState('')
  const [saving, setSaving] = useState(false)

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<InventoryMovement | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchData = useCallback(async () => {
    const [{ data: pData }, { data: wData }] = await Promise.all([
      insforge.database.from('products').select().order('name', { ascending: true }),
      insforge.database.from('warehouses').select().order('name', { ascending: true }),
    ])
    setProducts((pData as Product[]) || [])
    setWarehouses((wData as Warehouse[]) || [])
  }, [])

  const fetchMovements = useCallback(async () => {
    const from = (page - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1

    let query = insforge.database
      .from('inventory_movements')
      .select('*, products:product_id(name), warehouses:warehouse_id(name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (filterType) {
      query = query.eq('type', filterType)
    }

    const { data, error, count } = await query
    if (error) {
      showToast('Error cargando movimientos', 'danger')
      return
    }

    const mapped = ((data || []) as Record<string, unknown>[]).map(m => ({
      ...m,
      product_name: (m.products as { name: string } | null)?.name || '-',
      warehouse_name: (m.warehouses as { name: string } | null)?.name || '-',
    })) as InventoryMovement[]

    setMovements(mapped)
    setTotal(count || 0)
    setLoading(false)
  }, [page, filterType, showToast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    fetchMovements()
  }, [fetchMovements])

  const openDialog = (type: MovementType) => {
    setMovementType(type)
    setFormProduct('')
    setFormWarehouse(warehouses.find(w => w.is_default)?.id || '')
    setFormQuantity('')
    setFormReason('')
    setFormNote('')
    setFormFromWarehouse('')
    setFormToWarehouse('')
    setFormSourceProduct('')
    setFormTargetProduct('')
    setDialogOpen(true)
  }

  const handleSave = async () => {
    const qty = parseFloat(formQuantity)
    if (isNaN(qty) || qty <= 0 || !isValidQuantity(qty)) {
      showToast('Cantidad invalida. Solo enteros o .5', 'warning')
      return
    }

    setSaving(true)
    try {
      let rpcName = ''
      let params: Record<string, unknown> = {}

      switch (movementType) {
        case 'entry':
          if (!formProduct || !formWarehouse) {
            showToast('Seleccione producto y bodega', 'warning')
            setSaving(false)
            return
          }
          rpcName = 'process_inventory_entry'
          params = {
            p_product_id: formProduct,
            p_warehouse_id: formWarehouse,
            p_quantity: qty,
            p_note: formNote.trim() || null,
          }
          break

        case 'exit':
          if (!formProduct || !formWarehouse || !formReason) {
            showToast('Complete todos los campos', 'warning')
            setSaving(false)
            return
          }
          rpcName = 'process_inventory_exit'
          params = {
            p_product_id: formProduct,
            p_warehouse_id: formWarehouse,
            p_quantity: qty,
            p_reason: formReason,
            p_note: formNote.trim() || null,
          }
          break

        case 'transfer':
          if (!formProduct || !formFromWarehouse || !formToWarehouse) {
            showToast('Complete todos los campos', 'warning')
            setSaving(false)
            return
          }
          if (formFromWarehouse === formToWarehouse) {
            showToast('Las bodegas deben ser diferentes', 'warning')
            setSaving(false)
            return
          }
          rpcName = 'process_inventory_transfer'
          params = {
            p_product_id: formProduct,
            p_from_warehouse_id: formFromWarehouse,
            p_to_warehouse_id: formToWarehouse,
            p_quantity: qty,
            p_note: formNote.trim() || null,
          }
          break

        case 'exchange':
          if (!formSourceProduct || !formTargetProduct || !formWarehouse) {
            showToast('Complete todos los campos', 'warning')
            setSaving(false)
            return
          }
          if (formSourceProduct === formTargetProduct) {
            showToast('Los productos deben ser diferentes', 'warning')
            setSaving(false)
            return
          }
          rpcName = 'process_inventory_exchange'
          params = {
            p_source_product_id: formSourceProduct,
            p_target_product_id: formTargetProduct,
            p_warehouse_id: formWarehouse,
            p_quantity: qty,
            p_note: formNote.trim() || null,
          }
          break
      }

      const { error } = await insforge.database.rpc(rpcName, params)
      if (error) throw error
      showToast(`${INVENTORY_TYPES[movementType]} registrada exitosamente`, 'success')
      setDialogOpen(false)
      fetchMovements()
    } catch (err) {
      showToast((err as Error).message || 'Error registrando movimiento', 'danger')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const { error } = await insforge.database.rpc('reverse_inventory_movement', { p_movement_id: deleteTarget.id })
      if (error) throw error
      showToast('Movimiento eliminado y stock restaurado', 'success')
      setDeleteTarget(null)
      fetchMovements()
    } catch {
      showToast('Error eliminando movimiento', 'danger')
    } finally {
      setDeleting(false)
    }
  }

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

  if (loading) return <PageLoading />

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ArrowLeftRight className="h-6 w-6 text-primary" />
            Inventario
          </h1>
          <p className="text-sm text-muted-foreground">{total} movimientos registrados</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => openDialog('entry')} variant="default" size="sm">
            <ArrowDown className="h-4 w-4 mr-1" /> Entrada
          </Button>
          <Button onClick={() => openDialog('exit')} variant="destructive" size="sm">
            <ArrowUp className="h-4 w-4 mr-1" /> Salida
          </Button>
          <Button onClick={() => openDialog('transfer')} variant="outline" size="sm">
            <Repeat className="h-4 w-4 mr-1" /> Transferencia
          </Button>
          <Button onClick={() => openDialog('exchange')} variant="secondary" size="sm">
            <RefreshCw className="h-4 w-4 mr-1" /> Intercambio
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1) }} className="w-48">
              <option value="">Todos los tipos</option>
              {Object.entries(INVENTORY_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Movimientos de Inventario</CardTitle>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay movimientos registrados</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referencia</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Bodega</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Razon</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="w-20">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map(m => {
                    const Icon = typeIcons[m.type as MovementType] || ArrowLeftRight
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-mono text-xs">{m.reference}</TableCell>
                        <TableCell>
                          <span className={`flex items-center gap-1 ${typeColors[m.type as MovementType] || ''}`}>
                            <Icon className="h-3 w-3" />
                            {INVENTORY_TYPES[m.type as keyof typeof INVENTORY_TYPES]}
                          </span>
                        </TableCell>
                        <TableCell>{m.product_name || '-'}</TableCell>
                        <TableCell className="text-sm">{m.warehouse_name || '-'}</TableCell>
                        <TableCell className="font-mono">{formatQuantity(m.quantity)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {m.reason ? EXIT_REASONS[m.reason as keyof typeof EXIT_REASONS] || m.reason : '-'}
                          {m.note && <p className="text-xs">{m.note}</p>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDateTime(m.created_at)}</TableCell>
                        <TableCell>
                          {isAdmin && (
                            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(m)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>

      {/* Movement Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader>
          <DialogTitle>{INVENTORY_TYPES[movementType]} de Inventario</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Entry / Exit */}
          {(movementType === 'entry' || movementType === 'exit') && (
            <>
              <div className="space-y-2">
                <Label>Producto *</Label>
                <Select value={formProduct} onChange={e => setFormProduct(e.target.value)}>
                  <option value="">Seleccionar producto</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bodega *</Label>
                <Select value={formWarehouse} onChange={e => setFormWarehouse(e.target.value)}>
                  <option value="">Seleccionar bodega</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </Select>
              </div>
            </>
          )}

          {/* Transfer */}
          {movementType === 'transfer' && (
            <>
              <div className="space-y-2">
                <Label>Producto *</Label>
                <Select value={formProduct} onChange={e => setFormProduct(e.target.value)}>
                  <option value="">Seleccionar producto</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bodega Origen *</Label>
                <Select value={formFromWarehouse} onChange={e => setFormFromWarehouse(e.target.value)}>
                  <option value="">Seleccionar origen</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bodega Destino *</Label>
                <Select value={formToWarehouse} onChange={e => setFormToWarehouse(e.target.value)}>
                  <option value="">Seleccionar destino</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </Select>
              </div>
            </>
          )}

          {/* Exchange */}
          {movementType === 'exchange' && (
            <>
              <div className="space-y-2">
                <Label>Producto Origen *</Label>
                <Select value={formSourceProduct} onChange={e => setFormSourceProduct(e.target.value)}>
                  <option value="">Seleccionar producto origen</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Producto Destino *</Label>
                <Select value={formTargetProduct} onChange={e => setFormTargetProduct(e.target.value)}>
                  <option value="">Seleccionar producto destino</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bodega *</Label>
                <Select value={formWarehouse} onChange={e => setFormWarehouse(e.target.value)}>
                  <option value="">Seleccionar bodega</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </Select>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Cantidad * (solo enteros o .5)</Label>
            <Input type="number" value={formQuantity} onChange={e => setFormQuantity(e.target.value)} placeholder="Ej: 10, 5.5" min={0.5} step={0.5} />
          </div>

          {movementType === 'exit' && (
            <div className="space-y-2">
              <Label>Razon *</Label>
              <Select value={formReason} onChange={e => setFormReason(e.target.value)}>
                <option value="">Seleccionar razon</option>
                {Object.entries(EXIT_REASONS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Nota</Label>
            <Textarea value={formNote} onChange={e => setFormNote(e.target.value)} placeholder="Nota opcional" rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Registrando...' : 'Registrar'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        title="Eliminar Movimiento"
        description={`Esta seguro de eliminar el movimiento ${deleteTarget?.reference}? Se restaurara el stock.`}
        confirmText={deleting ? 'Eliminando...' : 'Eliminar'}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
