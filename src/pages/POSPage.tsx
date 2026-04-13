import { useState, useEffect, useCallback, useMemo } from 'react'
import { insforge } from '@/lib/insforge'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatQuantity, isValidQuantity } from '@/lib/utils'
import { PAYMENT_METHODS, TRANSFER_TYPES } from '@/lib/constants'
import type { Product, Client, CashRegister, CartItem } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { PageLoading } from '@/components/ui/loading'
import {
  ShoppingCart, Search, Plus, Minus, Trash2, DollarSign,
  CreditCard, Banknote, ArrowRightLeft, UserPlus, Wallet,
  Lock, Unlock, X
} from 'lucide-react'

export function POSPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)

  // POS data
  const [products, setProducts] = useState<(Product & { stock: number })[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [cashRegister, setCashRegister] = useState<CashRegister | null>(null)
  const [defaultWarehouseId, setDefaultWarehouseId] = useState<string | null>(null)

  // Search / filter
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])

  // Payment dialog
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [payMethod, setPayMethod] = useState<'cash' | 'transfer' | 'credit'>('cash')
  const [payTransfer, setPayTransfer] = useState<'nequi' | 'bancolombia' | 'davivienda'>('nequi')
  const [payClient, setPayClient] = useState('')
  const [payReceived, setPayReceived] = useState('')
  const [payNote, setPayNote] = useState('')
  const [processing, setProcessing] = useState(false)

  // Cash register dialogs
  const [openCashDialog, setOpenCashDialog] = useState(false)
  const [closeCashDialog, setCloseCashDialog] = useState(false)
  const [cashInitial, setCashInitial] = useState('0')
  const [openingCash, setOpeningCash] = useState(false)
  const [closingCash, setClosingCash] = useState(false)

  // Quick expense
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [expenseConcept, setExpenseConcept] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseNote, setExpenseNote] = useState('')
  const [savingExpense, setSavingExpense] = useState(false)

  // Quick client
  const [clientOpen, setClientOpen] = useState(false)
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [savingClient, setSavingClient] = useState(false)

  const fetchPosData = useCallback(async () => {
    try {
      // Get default warehouse
      const { data: wData } = await insforge.database
        .from('warehouses')
        .select()
        .eq('is_default', true)
        .maybeSingle()

      const warehouseId = (wData as { id: string } | null)?.id || null
      setDefaultWarehouseId(warehouseId)

      // Get products with stock from default warehouse
      const { data: pData } = await insforge.database
        .from('products')
        .select('*, product_stock!inner(quantity)')
        .eq('product_stock.warehouse_id', warehouseId || '')
        .order('name', { ascending: true })

      // Also get products without stock in default warehouse
      const { data: allProducts } = await insforge.database
        .from('products')
        .select('*')
        .order('name', { ascending: true })

      const stockMap = new Map<string, number>()
      if (pData) {
        for (const p of pData as Record<string, unknown>[]) {
          const stocks = p.product_stock as { quantity: number }[]
          const qty = stocks?.[0]?.quantity || 0
          stockMap.set(p.id as string, qty)
        }
      }

      const mapped = ((allProducts || []) as Product[]).map(p => ({
        ...p,
        stock: stockMap.get(p.id) || 0,
      }))

      setProducts(mapped)

      // Get clients
      const { data: cData } = await insforge.database
        .from('clients')
        .select()
        .order('name', { ascending: true })
      setClients((cData as Client[]) || [])

      // Get current open cash register
      const { data: crData } = await insforge.database
        .from('cash_registers')
        .select()
        .eq('status', 'open')
        .maybeSingle()
      setCashRegister((crData as CashRegister) || null)
    } catch {
      showToast('Error cargando datos del POS', 'danger')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchPosData()
  }, [fetchPosData])

  // Cart operations
  const addToCart = (product: Product & { stock: number }) => {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id)
      if (existing) {
        const newQty = existing.quantity + 1
        if (newQty > product.stock) {
          showToast('Stock insuficiente', 'warning')
          return prev
        }
        return prev.map(i =>
          i.product_id === product.id ? { ...i, quantity: newQty, subtotal: Math.round(newQty * i.unit_price) } : i
        )
      }
      if (product.stock <= 0) {
        showToast('Sin stock disponible', 'warning')
        return prev
      }
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.price,
        original_price: product.price,
        max_stock: product.stock,
        subtotal: product.price,
      }]
    })
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product_id !== productId) return item
        const newQty = item.quantity + delta
        if (newQty <= 0) return item
        if (!isValidQuantity(newQty)) return item
        if (newQty > item.max_stock) {
          showToast('Stock insuficiente', 'warning')
          return item
        }
        return { ...item, quantity: newQty, subtotal: Math.round(newQty * item.unit_price) }
      })
    })
  }

  const updatePrice = (productId: string, price: number) => {
    if (isNaN(price) || price < 0) return
    setCart(prev =>
      prev.map(item =>
        item.product_id === productId
          ? { ...item, unit_price: Math.round(price), subtotal: Math.round(item.quantity * Math.round(price)) }
          : item
      )
    )
  }

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.product_id !== productId))
  }

  const clearCart = () => setCart([])

  const cartTotal = useMemo(() => cart.reduce((s, i) => s + i.subtotal, 0), [cart])
  const cartItems = useMemo(() => cart.reduce((s, i) => s + i.quantity, 0), [cart])

  // Payment
  const openPayment = () => {
    if (!cashRegister) {
      showToast('Debe abrir la caja primero', 'warning')
      return
    }
    if (cart.length === 0) {
      showToast('El carrito esta vacio', 'warning')
      return
    }
    setPayMethod('cash')
    setPayTransfer('nequi')
    setPayClient('')
    setPayReceived(String(cartTotal))
    setPayNote('')
    setPaymentOpen(true)
  }

  const handleSale = async () => {
    if (payMethod === 'credit' && !payClient) {
      showToast('Seleccione un cliente para credito', 'warning')
      return
    }
    const received = payMethod === 'cash' ? parseInt(payReceived, 10) || 0 : 0
    if (payMethod === 'cash' && received < cartTotal) {
      showToast('El monto recibido es menor al total', 'warning')
      return
    }

    setProcessing(true)
    try {
      const items = cart.map(i => ({
        product_id: i.product_id,
        product_name: i.product_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        warehouse_id: defaultWarehouseId,
      }))

      const { error } = await insforge.database.rpc('process_pos_sale', {
        p_client_id: payClient || null,
        p_items: items,
        p_payment_method: payMethod,
        p_transfer_type: payMethod === 'transfer' ? payTransfer : null,
        p_received: received,
        p_note: payNote.trim() || null,
      })
      if (error) throw error

      const change = payMethod === 'cash' ? received - cartTotal : 0
      if (change > 0) {
        showToast(`Venta exitosa! Cambio: ${formatCurrency(change)}`, 'success')
      } else {
        showToast('Venta registrada exitosamente', 'success')
      }
      setPaymentOpen(false)
      clearCart()
      fetchPosData() // Refresh stock
    } catch (err) {
      showToast((err as Error).message || 'Error procesando venta', 'danger')
    } finally {
      setProcessing(false)
    }
  }

  // Cash register operations
  const handleOpenCash = async () => {
    const initial = parseInt(cashInitial, 10) || 0
    setOpeningCash(true)
    try {
      const ref = `C${Date.now()}`
      const { error } = await insforge.database
        .from('cash_registers')
        .insert([{
          reference: ref,
          initial_amount: Math.round(initial),
          total_sales: 0,
          total_expenses: 0,
          status: 'open',
          opened_at: new Date().toISOString(),
          user_id: user?.id || null,
        }])
      if (error) throw error
      showToast('Caja abierta exitosamente', 'success')
      setOpenCashDialog(false)
      fetchPosData()
    } catch {
      showToast('Error abriendo caja', 'danger')
    } finally {
      setOpeningCash(false)
    }
  }

  const handleCloseCash = async () => {
    if (!cashRegister) return
    setClosingCash(true)
    try {
      const finalAmount = cashRegister.initial_amount + cashRegister.total_sales - cashRegister.total_expenses
      const { error } = await insforge.database
        .from('cash_registers')
        .update({
          status: 'closed',
          final_amount: finalAmount,
          closed_at: new Date().toISOString(),
        })
        .eq('id', cashRegister.id)
      if (error) throw error
      showToast(`Caja cerrada. Monto final: ${formatCurrency(finalAmount)}`, 'success')
      setCloseCashDialog(false)
      fetchPosData()
    } catch {
      showToast('Error cerrando caja', 'danger')
    } finally {
      setClosingCash(false)
    }
  }

  // Quick expense
  const handleExpense = async () => {
    if (!cashRegister) {
      showToast('Debe abrir la caja primero', 'warning')
      return
    }
    const concept = expenseConcept.trim()
    const amount = parseInt(expenseAmount, 10)
    if (!concept || isNaN(amount) || amount <= 0) {
      showToast('Complete los campos correctamente', 'warning')
      return
    }
    setSavingExpense(true)
    try {
      // Create expense
      const { error: eErr } = await insforge.database
        .from('expenses')
        .insert([{
          reference: `G${Date.now()}`,
          concept,
          amount: Math.round(amount),
          date: new Date().toISOString().substring(0, 10),
          source: 'pos',
          note: expenseNote.trim() || null,
          user_id: user?.id || null,
        }])
      if (eErr) throw eErr

      // Update cash register
      const { error: cErr } = await insforge.database
        .from('cash_registers')
        .update({ total_expenses: cashRegister.total_expenses + Math.round(amount) })
        .eq('id', cashRegister.id)
      if (cErr) throw cErr

      showToast('Gasto registrado', 'success')
      setExpenseOpen(false)
      fetchPosData()
    } catch {
      showToast('Error registrando gasto', 'danger')
    } finally {
      setSavingExpense(false)
    }
  }

  // Quick client
  const handleCreateClient = async () => {
    const name = clientName.trim()
    if (!name) {
      showToast('El nombre es obligatorio', 'warning')
      return
    }
    setSavingClient(true)
    try {
      const { data, error } = await insforge.database
        .from('clients')
        .insert([{ name, phone: clientPhone.trim() || null }])
        .select()
      if (error) throw error
      showToast('Cliente creado', 'success')
      setClientOpen(false)
      const newClient = (data as Client[])?.[0]
      if (newClient) {
        setClients(prev => [...prev, newClient].sort((a, b) => a.name.localeCompare(b.name)))
        setPayClient(newClient.id)
      }
    } catch {
      showToast('Error creando cliente', 'danger')
    } finally {
      setSavingClient(false)
    }
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const change = payMethod === 'cash' ? (parseInt(payReceived, 10) || 0) - cartTotal : 0

  if (loading) return <PageLoading />

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-5rem)]">
      {/* Left: Products */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Cash register status bar */}
        <div className="flex items-center justify-between mb-3 p-3 rounded-lg bg-card border">
          <div className="flex items-center gap-2">
            {cashRegister ? (
              <>
                <Badge variant="success" className="flex items-center gap-1">
                  <Unlock className="h-3 w-3" /> Caja Abierta
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Inicial: {formatCurrency(cashRegister.initial_amount)} |
                  Ventas: {formatCurrency(cashRegister.total_sales)} |
                  Gastos: {formatCurrency(cashRegister.total_expenses)}
                </span>
              </>
            ) : (
              <Badge variant="destructive" className="flex items-center gap-1">
                <Lock className="h-3 w-3" /> Caja Cerrada
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            {!cashRegister ? (
              <Button size="sm" onClick={() => { setCashInitial('0'); setOpenCashDialog(true) }}>
                <Unlock className="h-4 w-4 mr-1" /> Abrir Caja
              </Button>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={() => {
                  setExpenseConcept(''); setExpenseAmount(''); setExpenseNote(''); setExpenseOpen(true)
                }}>
                  <Wallet className="h-4 w-4 mr-1" /> Gasto
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setCloseCashDialog(true)}>
                  <Lock className="h-4 w-4 mr-1" /> Cerrar
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar producto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {filteredProducts.map(p => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                disabled={p.stock <= 0}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  p.stock <= 0
                    ? 'opacity-50 cursor-not-allowed bg-muted'
                    : 'bg-card hover:bg-accent hover:border-primary cursor-pointer'
                }`}
              >
                <p className="font-medium text-sm truncate">{p.name}</p>
                <p className="text-primary font-bold">{formatCurrency(p.price)}</p>
                <p className={`text-xs ${p.stock <= 0 ? 'text-destructive' : p.stock < 10 ? 'text-warning' : 'text-muted-foreground'}`}>
                  Stock: {formatQuantity(p.stock)}
                </p>
              </button>
            ))}
          </div>
          {filteredProducts.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No se encontraron productos</p>
          )}
        </div>
      </div>

      {/* Right: Cart */}
      <div className="w-full lg:w-96 flex flex-col bg-card border rounded-lg">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Carrito ({cartItems})
          </h2>
          {cart.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearCart}>
              <X className="h-4 w-4 mr-1" /> Limpiar
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cart.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Carrito vacio</p>
          ) : (
            cart.map(item => (
              <div key={item.product_id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.product_name}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Input
                      type="number"
                      value={item.unit_price}
                      onChange={e => updatePrice(item.product_id, parseInt(e.target.value, 10))}
                      className="h-7 w-20 text-xs"
                      min={0}
                      step={100}
                    />
                    <span className="text-xs text-muted-foreground">c/u</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.product_id, -0.5)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-10 text-center text-sm font-mono">{formatQuantity(item.quantity)}</span>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.product_id, 0.5)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <div className="text-right min-w-[80px]">
                  <p className="text-sm font-bold">{formatCurrency(item.subtotal)}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeFromCart(item.product_id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Cart total and pay button */}
        <div className="p-4 border-t space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold">Total</span>
            <span className="text-2xl font-bold text-primary">{formatCurrency(cartTotal)}</span>
          </div>
          <Button className="w-full h-12 text-lg" onClick={openPayment} disabled={cart.length === 0 || !cashRegister}>
            <DollarSign className="h-5 w-5 mr-2" />
            Cobrar
          </Button>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogHeader>
          <DialogTitle>Procesar Pago - {formatCurrency(cartTotal)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Payment method buttons */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={payMethod === 'cash' ? 'default' : 'outline'}
              onClick={() => setPayMethod('cash')}
              className="flex flex-col gap-1 h-auto py-3"
            >
              <Banknote className="h-5 w-5" />
              <span className="text-xs">Efectivo</span>
            </Button>
            <Button
              variant={payMethod === 'transfer' ? 'default' : 'outline'}
              onClick={() => setPayMethod('transfer')}
              className="flex flex-col gap-1 h-auto py-3"
            >
              <ArrowRightLeft className="h-5 w-5" />
              <span className="text-xs">Transferencia</span>
            </Button>
            <Button
              variant={payMethod === 'credit' ? 'default' : 'outline'}
              onClick={() => setPayMethod('credit')}
              className="flex flex-col gap-1 h-auto py-3"
            >
              <CreditCard className="h-5 w-5" />
              <span className="text-xs">Credito</span>
            </Button>
          </div>

          {payMethod === 'cash' && (
            <div className="space-y-2">
              <Label>Monto Recibido</Label>
              <Input
                type="number"
                value={payReceived}
                onChange={e => setPayReceived(e.target.value)}
                min={cartTotal}
                step={100}
                autoFocus
              />
              {change > 0 && (
                <p className="text-lg font-bold text-success">Cambio: {formatCurrency(change)}</p>
              )}
            </div>
          )}

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

          {(payMethod === 'credit' || payMethod !== 'cash') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Cliente {payMethod === 'credit' && '*'}</Label>
                <Button variant="ghost" size="sm" onClick={() => { setClientName(''); setClientPhone(''); setClientOpen(true) }}>
                  <UserPlus className="h-3 w-3 mr-1" /> Nuevo
                </Button>
              </div>
              <Select value={payClient} onChange={e => setPayClient(e.target.value)}>
                <option value="">Sin cliente</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Nota</Label>
            <Textarea value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="Nota opcional" rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setPaymentOpen(false)}>Cancelar</Button>
          <Button onClick={handleSale} disabled={processing}>
            {processing ? 'Procesando...' : `Confirmar ${formatCurrency(cartTotal)}`}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Open Cash Dialog */}
      <Dialog open={openCashDialog} onOpenChange={setOpenCashDialog}>
        <DialogHeader>
          <DialogTitle>Abrir Caja Registradora</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Monto Inicial</Label>
            <Input type="number" value={cashInitial} onChange={e => setCashInitial(e.target.value)} min={0} step={1000} autoFocus />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpenCashDialog(false)}>Cancelar</Button>
          <Button onClick={handleOpenCash} disabled={openingCash}>
            {openingCash ? 'Abriendo...' : 'Abrir Caja'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Close Cash Dialog */}
      <Dialog open={closeCashDialog} onOpenChange={setCloseCashDialog}>
        <DialogHeader>
          <DialogTitle>Cerrar Caja Registradora</DialogTitle>
        </DialogHeader>
        {cashRegister && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Monto Inicial</p>
                <p className="font-bold">{formatCurrency(cashRegister.initial_amount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Ventas</p>
                <p className="font-bold text-success">{formatCurrency(cashRegister.total_sales)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Gastos</p>
                <p className="font-bold text-destructive">{formatCurrency(cashRegister.total_expenses)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monto Final Esperado</p>
                <p className="font-bold text-lg">
                  {formatCurrency(cashRegister.initial_amount + cashRegister.total_sales - cashRegister.total_expenses)}
                </p>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setCloseCashDialog(false)}>Cancelar</Button>
          <Button variant="destructive" onClick={handleCloseCash} disabled={closingCash}>
            {closingCash ? 'Cerrando...' : 'Cerrar Caja'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Quick Expense Dialog */}
      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogHeader>
          <DialogTitle>Gasto Rapido</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Concepto *</Label>
            <Input value={expenseConcept} onChange={e => setExpenseConcept(e.target.value)} placeholder="Concepto del gasto" autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Monto *</Label>
            <Input type="number" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} placeholder="Monto" min={1} step={100} />
          </div>
          <div className="space-y-2">
            <Label>Nota</Label>
            <Textarea value={expenseNote} onChange={e => setExpenseNote(e.target.value)} placeholder="Nota opcional" rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setExpenseOpen(false)}>Cancelar</Button>
          <Button onClick={handleExpense} disabled={savingExpense}>
            {savingExpense ? 'Registrando...' : 'Registrar Gasto'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Quick Client Dialog */}
      <Dialog open={clientOpen} onOpenChange={setClientOpen}>
        <DialogHeader>
          <DialogTitle>Crear Cliente Rapido</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nombre *</Label>
            <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nombre del cliente" autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Telefono</Label>
            <Input value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="Telefono opcional" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setClientOpen(false)}>Cancelar</Button>
          <Button onClick={handleCreateClient} disabled={savingClient}>
            {savingClient ? 'Creando...' : 'Crear Cliente'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
