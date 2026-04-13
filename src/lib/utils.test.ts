import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatNumber,
  parseNumber,
  formatQuantity,
  parseQuantity,
  isValidQuantity,
  roundQuantity,
  formatDate,
  formatDateShort,
  formatDateTime,
  getCurrentDate,
  getFirstDayOfMonth,
  getLastDayOfMonth,
} from './utils'

// ─── formatCurrency ────────────────────────────────────────────
describe('formatCurrency', () => {
  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$ 0')
  })

  it('formats small amounts without decimals', () => {
    expect(formatCurrency(500)).toBe('$ 500')
  })

  it('formats thousands with period separator', () => {
    expect(formatCurrency(1500)).toBe('$ 1.500')
  })

  it('formats millions', () => {
    expect(formatCurrency(1500000)).toBe('$ 1.500.000')
  })

  it('rounds down decimals (no centavos)', () => {
    expect(formatCurrency(1500.4)).toBe('$ 1.500')
  })

  it('rounds up decimals', () => {
    expect(formatCurrency(1500.6)).toBe('$ 1.501')
  })

  it('rounds .5 to nearest even (standard rounding)', () => {
    // Math.round(1500.5) = 1501
    expect(formatCurrency(1500.5)).toBe('$ 1.501')
  })

  it('handles negative amounts', () => {
    const result = formatCurrency(-5000)
    expect(result).toMatch(/[-−]\s?5\.000/) // es-CO may use minus sign or hyphen
  })

  it('handles very large amounts', () => {
    expect(formatCurrency(999999999)).toBe('$ 999.999.999')
  })
})

// ─── formatNumber ──────────────────────────────────────────────
describe('formatNumber', () => {
  it('formats without $ prefix', () => {
    expect(formatNumber(1500)).toBe('1.500')
  })

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0')
  })

  it('rounds decimals', () => {
    expect(formatNumber(1500.7)).toBe('1.501')
  })
})

// ─── parseNumber ───────────────────────────────────────────────
describe('parseNumber', () => {
  it('parses formatted number', () => {
    expect(parseNumber('1.500.000')).toBe(1500000)
  })

  it('parses plain number', () => {
    expect(parseNumber('500')).toBe(500)
  })

  it('returns 0 for empty string', () => {
    expect(parseNumber('')).toBe(0)
  })

  it('strips non-numeric chars except minus', () => {
    expect(parseNumber('$ 1.500')).toBe(1500)
  })

  it('handles negative numbers', () => {
    expect(parseNumber('-5.000')).toBe(-5000)
  })

  it('returns 0 for garbage input', () => {
    expect(parseNumber('abc')).toBe(0)
  })
})

// ─── formatQuantity ────────────────────────────────────────────
describe('formatQuantity', () => {
  it('formats integer quantity', () => {
    expect(formatQuantity(10)).toBe('10')
  })

  it('formats half quantity with comma', () => {
    expect(formatQuantity(10.5)).toBe('10,5')
  })

  it('formats large integer with thousands separator', () => {
    expect(formatQuantity(1000)).toBe('1.000')
  })

  it('formats large half quantity', () => {
    expect(formatQuantity(1000.5)).toBe('1.000,5')
  })

  it('formats zero', () => {
    expect(formatQuantity(0)).toBe('0')
  })

  it('formats 0.5', () => {
    expect(formatQuantity(0.5)).toBe('0,5')
  })
})

// ─── parseQuantity ─────────────────────────────────────────────
describe('parseQuantity', () => {
  it('parses integer string', () => {
    expect(parseQuantity('10')).toBe(10)
  })

  it('parses half quantity with comma', () => {
    expect(parseQuantity('10,5')).toBe(10.5)
  })

  it('parses thousands-formatted integer', () => {
    expect(parseQuantity('1.000')).toBe(1000)
  })

  it('parses thousands-formatted half', () => {
    expect(parseQuantity('1.000,5')).toBe(1000.5)
  })

  it('returns NaN for empty', () => {
    expect(parseQuantity('')).toBeNaN()
  })

  it('returns NaN for invalid decimal (not .5)', () => {
    expect(parseQuantity('10,3')).toBeNaN()
  })

  it('returns NaN for invalid format', () => {
    expect(parseQuantity('abc')).toBeNaN()
  })

  it('parses single digit', () => {
    expect(parseQuantity('5')).toBe(5)
  })

  it('parses 0,5', () => {
    expect(parseQuantity('0,5')).toBe(0.5)
  })
})

// ─── isValidQuantity ───────────────────────────────────────────
describe('isValidQuantity', () => {
  it('accepts integer', () => {
    expect(isValidQuantity(5)).toBe(true)
  })

  it('accepts half', () => {
    expect(isValidQuantity(5.5)).toBe(true)
  })

  it('accepts zero', () => {
    expect(isValidQuantity(0)).toBe(true)
  })

  it('rejects 0.3', () => {
    expect(isValidQuantity(0.3)).toBe(false)
  })

  it('rejects 1.2', () => {
    expect(isValidQuantity(1.2)).toBe(false)
  })

  it('rejects 1.7', () => {
    expect(isValidQuantity(1.7)).toBe(false)
  })

  it('rejects negative', () => {
    expect(isValidQuantity(-1)).toBe(false)
  })

  it('rejects NaN', () => {
    expect(isValidQuantity(NaN)).toBe(false)
  })

  it('accepts large half', () => {
    expect(isValidQuantity(999.5)).toBe(true)
  })

  it('accepts large integer', () => {
    expect(isValidQuantity(10000)).toBe(true)
  })
})

// ─── roundQuantity ─────────────────────────────────────────────
describe('roundQuantity', () => {
  it('rounds 1.3 to 1.5', () => {
    expect(roundQuantity(1.3)).toBe(1.5)
  })

  it('rounds 1.7 to 1.5', () => {
    expect(roundQuantity(1.7)).toBe(1.5)
  })

  it('rounds 1.8 to 2', () => {
    expect(roundQuantity(1.8)).toBe(2)
  })

  it('keeps integer', () => {
    expect(roundQuantity(3)).toBe(3)
  })

  it('keeps half', () => {
    expect(roundQuantity(3.5)).toBe(3.5)
  })

  it('rounds 0.1 to 0', () => {
    expect(roundQuantity(0.1)).toBe(0)
  })

  it('rounds 0.3 to 0.5', () => {
    expect(roundQuantity(0.3)).toBe(0.5)
  })
})

// ─── Date utilities ────────────────────────────────────────────
describe('getCurrentDate', () => {
  it('returns YYYY-MM-DD format', () => {
    const result = getCurrentDate()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('getFirstDayOfMonth', () => {
  it('returns YYYY-MM-01 format', () => {
    const result = getFirstDayOfMonth()
    expect(result).toMatch(/^\d{4}-\d{2}-01$/)
  })
})

describe('getLastDayOfMonth', () => {
  it('returns valid YYYY-MM-DD', () => {
    const result = getLastDayOfMonth()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    const day = parseInt(result.split('-')[2])
    expect(day).toBeGreaterThanOrEqual(28)
    expect(day).toBeLessThanOrEqual(31)
  })
})

describe('formatDate', () => {
  it('formats ISO date string', () => {
    const result = formatDate('2024-01-15')
    // es-CO format: "15 ene 2024" or similar
    expect(result).toContain('15')
    expect(result).toContain('2024')
  })

  it('returns empty for empty input', () => {
    expect(formatDate('')).toBe('')
  })
})

describe('formatDateShort', () => {
  it('formats to short date', () => {
    const result = formatDateShort('2024-01-15')
    // es-CO short: "15/01/24" or similar
    expect(result).toContain('15')
  })

  it('returns empty for empty input', () => {
    expect(formatDateShort('')).toBe('')
  })
})

describe('formatDateTime', () => {
  it('formats ISO datetime string', () => {
    const result = formatDateTime('2024-01-15T14:30:00Z')
    expect(result).toContain('15')
    expect(result).toContain('2024')
  })

  it('returns empty for empty input', () => {
    expect(formatDateTime('')).toBe('')
  })
})
