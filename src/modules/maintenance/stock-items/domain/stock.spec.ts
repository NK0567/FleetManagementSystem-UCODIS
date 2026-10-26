import { describe, expect, it } from 'vitest'
import { stockQuantity, stockStatus } from './stock'

describe('stock', () => {
  it('adds up the movements', () => {
    expect(stockQuantity([])).toBe(0)
    expect(stockQuantity([{ delta: 20 }, { delta: -1 }, { delta: -3 }])).toBe(16)
  })

  it('flags low stock at the threshold and out of stock at zero', () => {
    expect(stockStatus(7, 6)).toBe('available')
    expect(stockStatus(6, 6)).toBe('low')
    expect(stockStatus(0, 1)).toBe('out')
  })
})
