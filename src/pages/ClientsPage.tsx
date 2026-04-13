import { useState, useEffect, useCallback } from 'react'
import { insforge } from '@/lib/insforge'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Client } from '@/types'
import { ITEMS_PER_PAGE } from '@/lib/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { PageLoading } from '@/components/ui/loading'
import { Plus, Pencil, Trash2, Users, Search, Phone, MapPin } from 'lucide-react'

export function ClientsPage() {
  const { isAdmin } = useAuth()
  const { showToast } = useToast()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formAddress, setFormAddress] = useState('')
  const [formNote, setFormNote] = useState('')
  const [saving, setSaving] = useState(false)

  // Detail dialog
  const [detailClient, setDetailClient] = useState<Client | null>(null)

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchClients = useCallback(async () => {
    const from = (page - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1

    let query = insforge.database
      .from('clients')
      .select('*', { count: 'exact' })
      .order('name', { ascending: true })
      .range(from, to)

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data, error, count } = await query
    if (error) {
      showToast('Error cargando clientes', 'danger')
      return
    }
    setClients((data as Client[]) || [])
    setTotal(count || 0)
    setLoading(false)
  }, [page, search, showToast])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  // Fetch credit stats for a client
  const fetchClientStats = async (client: Client) => {
    // Get pending sales
    const { data: sales } = await insforge.database
      .from('sales')
      .select('total, total_paid, created_at')
      .eq('client_id', client.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    let totalPending = 0
    let daysOldest = 0
    if (sales && sales.length > 0) {
      for (const s of sales) {
        totalPending += (s as { total: number; total_paid: number }).total - (s as { total: number; total_paid: number }).total_paid
      }
      const oldest = new Date((sales[0] as { created_at: string }).created_at)
      daysOldest = Math.floor((Date.now() - oldest.getTime()) / (1000 * 60 * 60 * 24))
    }

    // Get total purchases
    const { count } = await insforge.database
      .from('sales')
      .select('*', { count: 'exact' })
      .eq('client_id', client.id)

    setDetailClient({
      ...client,
      total_purchases: count || 0,
      total_pending: totalPending,
      days_oldest_debt: daysOldest,
    })
  }

  const openCreate = () => {
    setEditing(null)
    setFormName('')
    setFormPhone('')
    setFormAddress('')
    setFormNote('')
    setDialogOpen(true)
  }

  const openEdit = (c: Client) => {
    setEditing(c)
    setFormName(c.name)
    setFormPhone(c.phone || '')
    setFormAddress(c.address || '')
    setFormNote(c.note || '')
    setDialogOpen(true)
  }

  const handleSave = async () => {
    const name = formName.trim()
    if (!name) {
      showToast('El nombre es obligatorio', 'warning')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name,
        phone: formPhone.trim() || null,
        address: formAddress.trim() || null,
        note: formNote.trim() || null,
      }
      if (editing) {
        const { error } = await insforge.database
          .from('clients')
          .update(payload)
          .eq('id', editing.id)
        if (error) throw error
        showToast('Cliente actualizado', 'success')
      } else {
        const { error } = await insforge.database
          .from('clients')
          .insert([payload])
        if (error) throw error
        showToast('Cliente creado', 'success')
      }
      setDialogOpen(false)
      fetchClients()
    } catch {
      showToast('Error guardando cliente', 'danger')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const { error } = await insforge.database
        .from('clients')
        .delete()
        .eq('id', deleteTarget.id)
      if (error) throw error
      showToast('Cliente eliminado', 'success')
      setDeleteTarget(null)
      fetchClients()
    } catch {
      showToast('Error eliminando cliente. Puede tener ventas asociadas.', 'danger')
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
            <Users className="h-6 w-6 text-primary" />
            Clientes
          </h1>
          <p className="text-sm text-muted-foreground">{total} clientes registrados</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lista de Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {search ? 'No se encontraron clientes' : 'No hay clientes registrados'}
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Telefono</TableHead>
                    <TableHead>Direccion</TableHead>
                    <TableHead>Creado</TableHead>
                    <TableHead className="w-32">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map(c => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <button
                          className="font-medium text-primary hover:underline"
                          onClick={() => fetchClientStats(c)}
                        >
                          {c.name}
                        </button>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.phone ? (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {c.phone}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.address ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {c.address}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(c.created_at?.substring(0, 10))}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(c)}>
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nombre *</Label>
            <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Nombre del cliente" autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Telefono</Label>
            <Input value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="Numero de telefono" />
          </div>
          <div className="space-y-2">
            <Label>Direccion</Label>
            <Input value={formAddress} onChange={e => setFormAddress(e.target.value)} placeholder="Direccion" />
          </div>
          <div className="space-y-2">
            <Label>Nota</Label>
            <Textarea value={formNote} onChange={e => setFormNote(e.target.value)} placeholder="Nota opcional" rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailClient} onOpenChange={open => !open && setDetailClient(null)}>
        <DialogHeader>
          <DialogTitle>Detalle de Cliente</DialogTitle>
        </DialogHeader>
        {detailClient && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nombre</p>
                <p className="font-medium">{detailClient.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Telefono</p>
                <p className="font-medium">{detailClient.phone || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Direccion</p>
                <p className="font-medium">{detailClient.address || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Compras</p>
                <p className="font-medium">{detailClient.total_purchases || 0}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Deuda Pendiente</p>
                <p className="font-medium text-lg">
                  {(detailClient.total_pending || 0) > 0 ? (
                    <span className="text-destructive">{formatCurrency(detailClient.total_pending || 0)}</span>
                  ) : (
                    <Badge variant="success">Sin deuda</Badge>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dias deuda mas antigua</p>
                <p className="font-medium">
                  {(detailClient.days_oldest_debt || 0) > 0 ? (
                    <span className={(detailClient.days_oldest_debt || 0) > 30 ? 'text-destructive' : 'text-warning'}>
                      {detailClient.days_oldest_debt} dias
                    </span>
                  ) : '-'}
                </p>
              </div>
            </div>
            {detailClient.note && (
              <div>
                <p className="text-sm text-muted-foreground">Nota</p>
                <p className="text-sm">{detailClient.note}</p>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setDetailClient(null)}>Cerrar</Button>
        </DialogFooter>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        title="Eliminar Cliente"
        description={`Esta seguro de eliminar "${deleteTarget?.name}"? Esta accion no se puede deshacer.`}
        confirmText={deleting ? 'Eliminando...' : 'Eliminar'}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
