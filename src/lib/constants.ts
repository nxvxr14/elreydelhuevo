export const EXIT_REASONS = {
  waste: 'Desecho',
  cracked: 'Picado',
  adjustment: 'Ajuste de inventario',
  gift_rodrigo: 'Obsequio Rodrigo',
} as const

export type ExitReason = keyof typeof EXIT_REASONS

export const PAYMENT_METHODS = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  credit: 'Credito',
} as const

export type PaymentMethod = keyof typeof PAYMENT_METHODS

export const TRANSFER_TYPES = {
  nequi: 'Nequi',
  bancolombia: 'Bancolombia',
  davivienda: 'Davivienda',
} as const

export type TransferType = keyof typeof TRANSFER_TYPES

export const INVENTORY_TYPES = {
  entry: 'Entrada',
  exit: 'Salida',
  transfer: 'Transferencia',
  exchange: 'Intercambio',
} as const

export type InventoryType = keyof typeof INVENTORY_TYPES

export const USER_ROLES = {
  admin: 'Administrador',
  vendedor: 'Vendedor',
} as const

export type UserRole = keyof typeof USER_ROLES

export const ITEMS_PER_PAGE = 20

export const LOW_STOCK_THRESHOLD = 10
