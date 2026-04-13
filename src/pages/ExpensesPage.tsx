import { useState, useEffect, useCallback } from 'react'
import { insforge } from '@/lib/insforge'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate, getCurrentDate, getFirstDayOfMonth, getLastDayOfMonth } from '@/lib/utils'
import type { Expense } from '@/types'
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
import { Plus, Trash2, Wallet, Search, DollarSign } from 'lucide-react'

export function ExpensesPage() {
  const { isAdmin } = useAuth()
  const { showToast } = useToast()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState(getFirstDayOfMonth())
  const [dateTo, setDateTo] = useState(getLastDayOfMonth())
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formConcept, setFormConcept] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formDate, setFormDate] = useState(getCurrentDate())
  const [formNote, setFormNote] = useState('')
  const [saving, setSaving] = useState(false)

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchExpenses = useCallback(async () => {
    const from = (page - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1

    let query = insforge.database
      .from('expenses')
      .select('*', { count: 'exact' })
      .gte('date', dateFrom)
      .lte('date', dateTo)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (search) {
      query = query.ilike('concept', `%${search}%`)
    }

    const { data, error, count } = await query
    if (error) {
      showToast('Error cargando gastos', 'danger')
      return
    }
    setExpenses((data as Expense[]) || [])
    setTotal(count || 0)

    // Get total for period
    let totalQuery = insforge.database
      .from('expenses')
      .select('amount')
      .gte('date', dateFrom)
      .lte('date', dateTo)
    if (search) {
      totalQuery = totalQuery.ilike('concept', `%${search}%`)
    }
    const { data: allData } = await totalQuery
    const sum = ((allData || []) as { amount: number }[]).reduce((s, e) => s + e.amount, 0)
    setTotalAmount(sum)
    setLoading(false)
  }, [page, search, dateFrom, dateTo, showToast])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  const openCreate = () => {
    setFormConcept('')
    setFormAmount('')
    setFormDate(getCurrentDate())
    setFormNote('')
    setDialogOpen(true)
  }

  const handleSave = async () => {
    const concept = formConcept.trim()
    const amount = parseInt(formAmount, 10)
    if (!concept) {
      showToast('El concepto es obligatorio', 'warning')
      return
    }
    if (isNaN(amount) || amount <= 0) {
      showToast('El monto debe ser mayor a 0', 'warning')
      return
    }
    if (!formDate) {
      showToast('La fecha es obligatoria', 'warning')
      return
    }
    setSaving(true)
    try {
      const { error } = await insforge.database
        .from('expenses')
        .insert([{
          reference: `G${Date.now()}`,
          concept,
          amount: Math.round(amount),
          date: formDate,
          source: 'dashboard',
          note: formNote.trim() || null,
        }])
      if (error) throw error
      showToast('Gasto registrado', 'success')
      setDialogOpen(false)
      fetchExpenses()
    } catch {
      showToast('Error registrando gasto', 'danger')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const { error } = await insforge.database
        .from('expenses')
        .delete()
        .eq('id', deleteTarget.id)
      if (error) throw error
      showToast('Gasto eliminado', 'success')
      setDeleteTarget(null)
      fetchExpenses()
    } catch {
      showToast('Error eliminando gasto', 'danger')
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
            <Wallet className="h-6 w-6 text-primary" />
            Gastos
          </h1>
          <p className="text-sm text-muted-foreground">{total} gastos en el periodo</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Gasto
        </Button>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Gastos del Periodo</p>
              <p className="text-xl font-bold text-destructive">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por concepto..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                className="pl-9"
              />
            </div>
            <Input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1) }}
              className="sm:w-40"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1) }}
              className="sm:w-40"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Registro de Gastos</CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay gastos registrados en este periodo</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referencia</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead className="w-20">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{e.reference}</TableCell>
                      <TableCell className="font-medium">
                        {e.concept}
                        {e.note && <p className="text-xs text-muted-foreground mt-1">{e.note}</p>}
                      </TableCell>
                      <TableCell className="font-mono text-destructive">{formatCurrency(e.amount)}</TableCell>
                      <TableCell className="text-sm">{formatDate(e.date)}</TableCell>
                      <TableCell>
                        <Badge variant={e.source === 'pos' ? 'default' : 'secondary'}>
                          {e.source === 'pos' ? 'POS' : 'Manual'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(e)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
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

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader>
          <DialogTitle>Nuevo Gasto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Concepto *</Label>
            <Input value={formConcept} onChange={e => setFormConcept(e.target.value)} placeholder="Concepto del gasto" autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Monto *</Label>
            <Input type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)} placeholder="Monto en pesos" min={1} step={1} />
          </div>
          <div className="space-y-2">
            <Label>Fecha *</Label>
            <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Nota</Label>
            <Textarea value={formNote} onChange={e => setFormNote(e.target.value)} placeholder="Nota opcional" rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Registrar'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        title="Eliminar Gasto"
        description={`Esta seguro de eliminar el gasto "${deleteTarget?.concept}" por ${deleteTarget ? formatCurrency(deleteTarget.amount) : ''}?`}
        confirmText={deleting ? 'Eliminando...' : 'Eliminar'}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
