import { useState, useEffect, useCallback } from 'react'
import { insforge } from '@/lib/insforge'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/contexts/AuthContext'
import type { Warehouse } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { PageLoading } from '@/components/ui/loading'
import { Plus, Pencil, Trash2, Warehouse as WarehouseIcon, Search } from 'lucide-react'

export function WarehousesPage() {
  const { isAdmin } = useAuth()
  const { showToast } = useToast()
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Warehouse | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [saving, setSaving] = useState(false)

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Warehouse | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchWarehouses = useCallback(async () => {
    const { data, error } = await insforge.database
      .from('warehouses')
      .select()
      .order('is_default', { ascending: false })
    if (error) {
      showToast('Error cargando bodegas', 'danger')
      return
    }
    setWarehouses((data as Warehouse[]) || [])
    setLoading(false)
  }, [showToast])

  useEffect(() => {
    fetchWarehouses()
  }, [fetchWarehouses])

  const openCreate = () => {
    setEditing(null)
    setFormName('')
    setFormDescription('')
    setDialogOpen(true)
  }

  const openEdit = (w: Warehouse) => {
    setEditing(w)
    setFormName(w.name)
    setFormDescription(w.description || '')
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
      if (editing) {
        const { error } = await insforge.database
          .from('warehouses')
          .update({ name, description: formDescription.trim() || null })
          .eq('id', editing.id)
        if (error) throw error
        showToast('Bodega actualizada', 'success')
      } else {
        const { error } = await insforge.database
          .from('warehouses')
          .insert([{ name, description: formDescription.trim() || null }])
        if (error) throw error
        showToast('Bodega creada', 'success')
      }
      setDialogOpen(false)
      fetchWarehouses()
    } catch {
      showToast('Error guardando bodega', 'danger')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    if (deleteTarget.is_default) {
      showToast('No se puede eliminar la bodega por defecto', 'warning')
      setDeleteTarget(null)
      return
    }
    setDeleting(true)
    try {
      const { error } = await insforge.database
        .from('warehouses')
        .delete()
        .eq('id', deleteTarget.id)
      if (error) throw error
      showToast('Bodega eliminada', 'success')
      setDeleteTarget(null)
      fetchWarehouses()
    } catch {
      showToast('Error eliminando bodega. Puede tener stock asociado.', 'danger')
    } finally {
      setDeleting(false)
    }
  }

  const filtered = warehouses.filter(w =>
    w.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <PageLoading />

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <WarehouseIcon className="h-6 w-6 text-primary" />
            Bodegas
          </h1>
          <p className="text-sm text-muted-foreground">{warehouses.length} bodegas registradas</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Bodega
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar bodega..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lista de Bodegas</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {search ? 'No se encontraron bodegas' : 'No hay bodegas registradas'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripcion</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="w-24">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(w => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">{w.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {w.description || '-'}
                    </TableCell>
                    <TableCell>
                      {w.is_default ? (
                        <Badge variant="default">Principal</Badge>
                      ) : (
                        <Badge variant="secondary">Secundaria</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(w)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {isAdmin && !w.is_default && (
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(w)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar Bodega' : 'Nueva Bodega'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nombre *</Label>
            <Input
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder="Nombre de la bodega"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Descripcion</Label>
            <Textarea
              value={formDescription}
              onChange={e => setFormDescription(e.target.value)}
              placeholder="Descripcion opcional"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogFooter>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        title="Eliminar Bodega"
        description={`Esta seguro de eliminar "${deleteTarget?.name}"? Esta accion no se puede deshacer.`}
        confirmText={deleting ? 'Eliminando...' : 'Eliminar'}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
