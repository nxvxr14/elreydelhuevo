export interface Profile {
  id: string
  role: 'admin' | 'vendedor'
  name: string
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface Warehouse {
  id: string
  name: string
  description: string | null
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  name: string
  category_id: string | null
  price: number
  created_at: string
  updated_at: string
  // Computed fields
  category_name?: string
  stock?: number
  warehouse_stock?: ProductStock[]
}

export interface ProductStock {
  id: string
  product_id: string
  warehouse_id: string
  quantity: number
  // Joined
  warehouse_name?: string
}

export interface Client {
  id: string
  name: string
  phone: string | null
  address: string | null
  note: string | null
  created_at: string
  updated_at: string
  // Computed
  total_purchases?: number
  total_pending?: number
  days_oldest_debt?: number
}

export interface Sale {
  id: string
  reference: string
  client_id: string | null
  total: number
  received: number
  change: number
  payment_method: 'cash' | 'transfer' | 'credit'
  transfer_type: 'nequi' | 'bancolombia' | 'davivienda' | null
  source: 'pos' | 'dashboard'
  note: string | null
  status: 'completed' | 'pending'
  total_paid: number
  user_id: string | null
  created_at: string
  updated_at: string
  // Joined
  client_name?: string
  items?: SaleItem[]
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string | null
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
  warehouse_id: string | null
}

export interface Expense {
  id: string
  reference: string
  concept: string
  amount: number
  date: string
  source: 'pos' | 'dashboard'
  note: string | null
  user_id: string | null
  created_at: string
  updated_at: string
}

export interface InventoryMovement {
  id: string
  reference: string
  type: 'entry' | 'exit' | 'transfer' | 'exchange'
  product_id: string | null
  warehouse_id: string | null
  quantity: number
  reason: string | null
  from_warehouse_id: string | null
  to_warehouse_id: string | null
  source_product_id: string | null
  target_product_id: string | null
  note: string | null
  user_id: string | null
  created_at: string
  // Joined
  product_name?: string
  warehouse_name?: string
  from_warehouse_name?: string
  to_warehouse_name?: string
  source_product_name?: string
  target_product_name?: string
}

export interface CashRegister {
  id: string
  reference: string
  initial_amount: number
  total_sales: number
  total_expenses: number
  final_amount: number | null
  status: 'open' | 'closed'
  opened_at: string
  closed_at: string | null
  user_id: string | null
}

export interface Payment {
  id: string
  reference: string
  client_id: string
  amount: number
  payment_method: 'cash' | 'transfer'
  transfer_type: 'nequi' | 'bancolombia' | 'davivienda' | null
  note: string | null
  user_id: string | null
  created_at: string
  // Joined
  client_name?: string
  allocations?: PaymentAllocation[]
}

export interface PaymentAllocation {
  id: string
  payment_id: string
  sale_id: string
  amount: number
  // Joined
  sale_reference?: string
}

export interface CartItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  original_price: number
  max_stock: number
  subtotal: number
}

export interface PosData {
  products: Product[]
  clients: Client[]
  cashStatus: CashRegister | null
  defaultWarehouseId: string | null
}

export interface DashboardMetrics {
  totalSales: number
  totalExpenses: number
  totalProfit: number
  salesCount: number
  expensesCount: number
  basketsSold: number
}

export interface DailyReport {
  sales: {
    total: number
    cash: number
    transfer: number
    nequi: number
    bancolombia: number
    davivienda: number
    count: number
    baskets: number
  }
  credits: {
    total: number
    cash: number
    transfer: number
    nequi: number
    bancolombia: number
    davivienda: number
    count: number
  }
  consolidated: {
    totalCash: number
    totalTransfer: number
    totalNequi: number
    totalBancolombia: number
    totalDavivienda: number
  }
  expenses: { total: number; count: number }
  inventory: { entries: number; exits: number }
  cashRegister: CashRegister | null
  totalIncome: number
  totalProfit: number
}
