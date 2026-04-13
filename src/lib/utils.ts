import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format as Colombian Pesos: "$ 1.500.000" - no decimals */
export function formatCurrency(amount: number): string {
  return '$ ' + Math.round(amount).toLocaleString('es-CO')
}

/** Format number with thousands separator, no $ prefix */
export function formatNumber(num: number): string {
  return Math.round(num).toLocaleString('es-CO')
}

/** Parse formatted number string to integer: "1.500.000" -> 1500000 */
export function parseNumber(str: string): number {
  if (!str) return 0
  return parseInt(str.replace(/\./g, '').replace(/[^0-9-]/g, ''), 10) || 0
}

/** Format quantity with half-unit support: 1000.5 -> "1.000,5", 1000 -> "1.000" */
export function formatQuantity(num: number): string {
  const intPart = Math.floor(num)
  const decPart = num - intPart
  const formatted = intPart.toLocaleString('es-CO')
  if (Math.abs(decPart - 0.5) < 0.001) {
    return formatted + ',5'
  }
  return formatted
}

/** Parse quantity string: "1.000,5" -> 1000.5. Returns NaN for invalid */
export function parseQuantity(str: string): number {
  if (!str) return NaN
  const trimmed = str.trim()
  // Allow: "123", "1.000", "123,5", "1.000,5"
  if (!/^\d{1,3}(\.\d{3})*(,5)?$/.test(trimmed) && !/^\d+(,5)?$/.test(trimmed)) {
    return NaN
  }
  const cleaned = trimmed.replace(/\./g, '').replace(',', '.')
  return parseFloat(cleaned)
}

/** Validate quantity: only integers or .5 allowed */
export function isValidQuantity(num: number): boolean {
  if (isNaN(num) || num < 0) return false
  const decimal = num - Math.floor(num)
  return decimal === 0 || Math.abs(decimal - 0.5) < 0.001
}

/** Round to nearest 0.5 */
export function roundQuantity(num: number): number {
  return Math.round(num * 2) / 2
}

/** Get current date in Bogota timezone as YYYY-MM-DD */
export function getCurrentDate(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
}

/** Get first day of current month in Bogota timezone */
export function getFirstDayOfMonth(): string {
  const now = new Date()
  const bogota = new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }))
  return `${bogota.getFullYear()}-${String(bogota.getMonth() + 1).padStart(2, '0')}-01`
}

/** Get last day of current month in Bogota timezone */
export function getLastDayOfMonth(): string {
  const now = new Date()
  const bogota = new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }))
  const lastDay = new Date(bogota.getFullYear(), bogota.getMonth() + 1, 0)
  return `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`
}

/** Format date for display: "2024-01-15" -> "15 ene 2024" */
export function formatDate(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString + 'T00:00:00')
  return date.toLocaleDateString('es-CO', {
    day: 'numeric', month: 'short', year: 'numeric',
    timeZone: 'America/Bogota'
  })
}

/** Format date short: "15/01/24" */
export function formatDateShort(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString + 'T00:00:00')
  return date.toLocaleDateString('es-CO', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    timeZone: 'America/Bogota'
  })
}

/** Format datetime for display */
export function formatDateTime(dateTimeString: string): string {
  if (!dateTimeString) return ''
  const date = new Date(dateTimeString)
  return date.toLocaleString('es-CO', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Bogota'
  })
}

/** Debounce function */
export function debounce<T extends (...args: unknown[]) => unknown>(func: T, wait: number): T {
  let timeout: ReturnType<typeof setTimeout>
  return ((...args: unknown[]) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }) as T
}
