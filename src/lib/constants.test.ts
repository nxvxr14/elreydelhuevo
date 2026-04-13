import { describe, it, expect } from 'vitest'
import {
  EXIT_REASONS,
  PAYMENT_METHODS,
  TRANSFER_TYPES,
  INVENTORY_TYPES,
  USER_ROLES,
  ITEMS_PER_PAGE,
  LOW_STOCK_THRESHOLD,
} from './constants'

describe('EXIT_REASONS', () => {
  it('has all required exit reasons', () => {
    expect(EXIT_REASONS).toHaveProperty('waste')
    expect(EXIT_REASONS).toHaveProperty('cracked')
    expect(EXIT_REASONS).toHaveProperty('adjustment')
    expect(EXIT_REASONS).toHaveProperty('gift_rodrigo')
  })

  it('has exactly 4 reasons', () => {
    expect(Object.keys(EXIT_REASONS)).toHaveLength(4)
  })

  it('has Spanish labels', () => {
    expect(EXIT_REASONS.waste).toBe('Desecho')
    expect(EXIT_REASONS.cracked).toBe('Picado')
    expect(EXIT_REASONS.adjustment).toBe('Ajuste de inventario')
    expect(EXIT_REASONS.gift_rodrigo).toBe('Obsequio Rodrigo')
  })
})

describe('PAYMENT_METHODS', () => {
  it('has cash, transfer, credit', () => {
    expect(PAYMENT_METHODS).toHaveProperty('cash')
    expect(PAYMENT_METHODS).toHaveProperty('transfer')
    expect(PAYMENT_METHODS).toHaveProperty('credit')
  })

  it('has exactly 3 methods', () => {
    expect(Object.keys(PAYMENT_METHODS)).toHaveLength(3)
  })

  it('has Spanish labels', () => {
    expect(PAYMENT_METHODS.cash).toBe('Efectivo')
    expect(PAYMENT_METHODS.transfer).toBe('Transferencia')
    expect(PAYMENT_METHODS.credit).toBe('Credito')
  })
})

describe('TRANSFER_TYPES', () => {
  it('has nequi, bancolombia, davivienda', () => {
    expect(TRANSFER_TYPES).toHaveProperty('nequi')
    expect(TRANSFER_TYPES).toHaveProperty('bancolombia')
    expect(TRANSFER_TYPES).toHaveProperty('davivienda')
  })

  it('has exactly 3 types', () => {
    expect(Object.keys(TRANSFER_TYPES)).toHaveLength(3)
  })
})

describe('INVENTORY_TYPES', () => {
  it('has all 4 types', () => {
    expect(INVENTORY_TYPES).toHaveProperty('entry')
    expect(INVENTORY_TYPES).toHaveProperty('exit')
    expect(INVENTORY_TYPES).toHaveProperty('transfer')
    expect(INVENTORY_TYPES).toHaveProperty('exchange')
  })

  it('has exactly 4 types', () => {
    expect(Object.keys(INVENTORY_TYPES)).toHaveLength(4)
  })
})

describe('USER_ROLES', () => {
  it('has admin and vendedor', () => {
    expect(USER_ROLES).toHaveProperty('admin')
    expect(USER_ROLES).toHaveProperty('vendedor')
  })

  it('has exactly 2 roles', () => {
    expect(Object.keys(USER_ROLES)).toHaveLength(2)
  })
})

describe('Config constants', () => {
  it('ITEMS_PER_PAGE is a positive number', () => {
    expect(ITEMS_PER_PAGE).toBeGreaterThan(0)
    expect(Number.isInteger(ITEMS_PER_PAGE)).toBe(true)
  })

  it('LOW_STOCK_THRESHOLD is a positive number', () => {
    expect(LOW_STOCK_THRESHOLD).toBeGreaterThan(0)
    expect(Number.isInteger(LOW_STOCK_THRESHOLD)).toBe(true)
  })
})
