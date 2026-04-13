import { useState, useEffect, useCallback } from 'react'
import { insforge } from '@/lib/insforge'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/contexts/AuthContext'
import type { Category } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { PageLoading } from '@/components/ui/loading'
import { Plus, Pencil, Trash2, Tags, Search } from 'lucide-react'

export function CategoriesPage() {
  const { isAdmin } = useAuth()
  const { showToast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [saving, setSaving] = useState(false)

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchCategories = useCallback(async () => {
    const { data, error } = await insforge.database
      .from('categories')
      .select()
      .order('name', { ascending: true })
    if (error) {
      showToast('Error cargando categorias', 'danger')
      return
    }
    setCategories((data as Category[]) || [])
    setLoading(false)
  }, [showToast])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const openCreate = () => {
    setEditing(null)
    setFormName('')
    setFormDescription('')
    setDialogOpen(true)
  }

  const openEdit = (cat: Category) => {
    setEditing(cat)
    setFormName(cat.name)
    setFormDescription(cat.description || '')
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
          .from('categories')
          .update({ name, description: formDescription.trim() || null })
          .eq('id', editing.id)
        if (error) throw error
        showToast('Categoria actualizada', 'success')
      } else {
        const { error } = await insforge.database
          .from('categories')
          .insert([{ name, description: formDescription.trim() || null }])
        if (error) throw error
        showToast('Categoria creada', 'success')
      }
      setDialogOpen(false)
      fetchCategories()
    } catch {
      showToast('Error guardando categoria', 'danger')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const { error } = await insforge.database
        .from('categories')
        .delete()
        .eq('id', deleteTarget.id)
      if (error) throw error
      showToast('Categoria eliminada', 'success')
      setDeleteTarget(null)
      fetchCategories()
    } catch {
      showToast('Error eliminando categoria. Puede tener productos asociados.', 'danger')
    } finally {
      setDeleting(false)
    }
  }

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <PageLoading />

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Tags className="h-6 w-6 text-primary" />
            Categorias
          </h1>
          <p className="text-sm text-muted-foreground">{categories.length} categorias registradas</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Categoria
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar categoria..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lista de Categorias</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {search ? 'No se encontraron categorias' : 'No hay categorias registradas'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripcion</TableHead>
                  <TableHead className="w-24">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(cat => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {cat.description || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(cat)}>
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar Categoria' : 'Nueva Categoria'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nombre *</Label>
            <Input
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder="Nombre de la categoria"
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

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        title="Eliminar Categoria"
        description={`Esta seguro de eliminar "${deleteTarget?.name}"? Esta accion no se puede deshacer.`}
        confirmText={deleting ? 'Eliminando...' : 'Eliminar'}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
