import { useState, useEffect, useCallback } from 'react'
import { insforge } from '@/lib/insforge'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatQuantity } from '@/lib/utils'
import type { Product, Category, ProductStock } from '@/types'
import { ITEMS_PER_PAGE } from '@/lib/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { PageLoading } from '@/components/ui/loading'
import { Plus, Pencil, Trash2, Package, Search, Eye } from 'lucide-react'

export function ProductsPage() {
  const { isAdmin } = useAuth()
  const { showToast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [formName, setFormName] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [saving, setSaving] = useState(false)

  // Stock detail
  const [stockDetail, setStockDetail] = useState<{ product: Product; stocks: ProductStock[] } | null>(null)

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchCategories = useCallback(async () => {
    const { data } = await insforge.database
      .from('categories')
      .select()
      .order('name', { ascending: true })
    setCategories((data as Category[]) || [])
  }, [])

  const fetchProducts = useCallback(async () => {
    const from = (page - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1

    let query = insforge.database
      .from('products')
      .select('*, categories(name)', { count: 'exact' })
      .order('name', { ascending: true })
      .range(from, to)

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }
    if (filterCategory) {
      query = query.eq('category_id', filterCategory)
    }

    const { data, error, count } = await query
    if (error) {
      showToast('Error cargando productos', 'danger')
      return
    }

    // Map category name from join
    const mapped = ((data || []) as Record<string, unknown>[]).map(p => ({
      ...p,
      category_name: (p.categories as { name: string } | null)?.name || 'Sin categoria',
    })) as Product[]

    setProducts(mapped)
    setTotal(count || 0)
    setLoading(false)
  }, [page, search, filterCategory, showToast])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const fetchStock = async (product: Product) => {
    const { data } = await insforge.database
      .from('product_stock')
      .select('*, warehouses(name)')
      .eq('product_id', product.id)

    const stocks = ((data || []) as Record<string, unknown>[]).map(s => ({
      ...s,
      warehouse_name: (s.warehouses as { name: string } | null)?.name || 'Desconocido',
    })) as ProductStock[]

    setStockDetail({ product, stocks })
  }

  const openCreate = () => {
    setEditing(null)
    setFormName('')
    setFormPrice('')
    setFormCategory('')
    setDialogOpen(true)
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setFormName(p.name)
    setFormPrice(String(p.price))
    setFormCategory(p.category_id || '')
    setDialogOpen(true)
  }

  const handleSave = async () => {
    const name = formName.trim()
    const price = parseInt(formPrice, 10)
    if (!name) {
      showToast('El nombre es obligatorio', 'warning')
      return
    }
    if (isNaN(price) || price < 0) {
      showToast('El precio debe ser un numero valido', 'warning')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name,
        price: Math.round(price),
        category_id: formCategory || null,
      }
      if (editing) {
        const { error } = await insforge.database
          .from('products')
          .update(payload)
          .eq('id', editing.id)
        if (error) throw error
        showToast('Producto actualizado', 'success')
      } else {
        const { error } = await insforge.database
          .from('products')
          .insert([payload])
        if (error) throw error
        showToast('Producto creado', 'success')
      }
      setDialogOpen(false)
      fetchProducts()
    } catch {
      showToast('Error guardando producto', 'danger')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const { error } = await insforge.database
        .from('products')
        .delete()
        .eq('id', deleteTarget.id)
      if (error) throw error
      showToast('Producto eliminado', 'success')
      setDeleteTarget(null)
      fetchProducts()
    } catch {
      showToast('Error eliminando producto. Puede tener stock o ventas asociadas.', 'danger')
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
            <Package className="h-6 w-6 text-primary" />
            Productos
          </h1>
          <p className="text-sm text-muted-foreground">{total} productos registrados</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Producto
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar producto..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                className="pl-9"
              />
            </div>
            <Select
              value={filterCategory}
              onChange={e => { setFilterCategory(e.target.value); setPage(1) }}
              className="sm:w-48"
            >
              <option value="">Todas las categorias</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lista de Productos</CardTitle>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {search || filterCategory ? 'No se encontraron productos' : 'No hay productos registrados'}
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead className="w-32">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{p.category_name || 'Sin categoria'}</Badge>
                      </TableCell>
                      <TableCell className="font-mono">{formatCurrency(p.price)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => fetchStock(p)}
                          className="text-primary hover:text-primary"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Ver stock
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(p)}>
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
          <DialogTitle>{editing ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nombre *</Label>
            <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Nombre del producto" autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Precio *</Label>
            <Input
              type="number"
              value={formPrice}
              onChange={e => setFormPrice(e.target.value)}
              placeholder="Precio en pesos"
              min={0}
              step={1}
            />
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={formCategory} onChange={e => setFormCategory(e.target.value)}>
              <option value="">Sin categoria</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Stock Detail Dialog */}
      <Dialog open={!!stockDetail} onOpenChange={open => !open && setStockDetail(null)}>
        <DialogHeader>
          <DialogTitle>Stock: {stockDetail?.product.name}</DialogTitle>
        </DialogHeader>
        {stockDetail && (
          <div className="py-4">
            {stockDetail.stocks.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Sin stock registrado</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bodega</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockDetail.stocks.map(s => (
                    <TableRow key={s.id}>
                      <TableCell>{s.warehouse_name}</TableCell>
                      <TableCell className="text-right font-mono">
                        <span className={s.quantity <= 0 ? 'text-destructive' : s.quantity < 10 ? 'text-warning' : ''}>
                          {formatQuantity(s.quantity)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell className="font-bold">Total</TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {formatQuantity(stockDetail.stocks.reduce((sum, s) => sum + s.quantity, 0))}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setStockDetail(null)}>Cerrar</Button>
        </DialogFooter>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        title="Eliminar Producto"
        description={`Esta seguro de eliminar "${deleteTarget?.name}"? Esta accion no se puede deshacer.`}
        confirmText={deleting ? 'Eliminando...' : 'Eliminar'}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
