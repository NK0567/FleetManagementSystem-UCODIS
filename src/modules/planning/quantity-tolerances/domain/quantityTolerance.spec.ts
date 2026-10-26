import { describe, expect, it } from 'vitest'
import {
  applicableTolerance,
  quantityGap,
  toleranceIssues,
  type ToleranceRule
} from './quantityTolerance'

const company: ToleranceRule = {
  no: 'TOL-001',
  customerNo: null,
  productNo: null,
  value: 0.5,
  unit: 'percent'
}
const customer: ToleranceRule = { ...company, no: 'TOL-002', customerNo: 'CLI-001', value: 1 }
const product: ToleranceRule = {
  ...company,
  no: 'TOL-003',
  productNo: 'PRD-006',
  value: 20,
  unit: 'quantity'
}
const rules = [company, customer, product]

describe('quantity tolerance', () => {
  it('takes the most precise rule', () => {
    expect(applicableTolerance(rules, 'CLI-001', 'PRD-006')).toEqual({
      rule: customer,
      source: 'customer'
    })
    expect(applicableTolerance(rules, 'CLI-002', 'PRD-006')?.source).toBe('product')
    expect(applicableTolerance(rules, null, 'PRD-001')?.source).toBe('company')
    const exact = { ...product, no: 'TOL-004', customerNo: 'CLI-001' }
    expect(applicableTolerance([...rules, exact], 'CLI-001', 'PRD-006')?.rule).toBe(exact)
    expect(applicableTolerance([], 'CLI-001', null)).toBeNull()
  })

  it('measures a gap in percent of the loaded quantity or in units', () => {
    expect(quantityGap(customer, 1_000, 992)).toEqual({ gap: -8, outside: false })
    expect(quantityGap(customer, 1_000, 985)).toEqual({ gap: -15, outside: true })
    expect(quantityGap(product, 30_000, 29_975)).toEqual({ gap: -25, outside: true })
    expect(quantityGap(company, 0, 3).outside).toBe(true)
  })

  it('checks the unit against the scope', () => {
    expect(toleranceIssues({ ...company, value: 120 })).toEqual(['percentAbove100'])
    expect(toleranceIssues({ ...company, unit: 'quantity' })).toEqual(['quantityNeedsProduct'])
  })
})
