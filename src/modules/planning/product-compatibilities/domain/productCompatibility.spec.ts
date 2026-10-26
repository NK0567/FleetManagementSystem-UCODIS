import { describe, expect, it } from 'vitest'
import {
  forbiddenSuccession,
  forbiddenTogether,
  sameRule,
  type CompatibilityRule
} from './productCompatibility'

const keroseneWithPetrol: CompatibilityRule = {
  kind: 'together',
  productANo: 'PRD-008',
  productBNo: 'PRD-007',
  active: true
}
const dieselAfterPetrol: CompatibilityRule = {
  kind: 'succession',
  productANo: 'PRD-007',
  productBNo: 'PRD-006',
  active: true
}
const rules = [keroseneWithPetrol, dieselAfterPetrol]

describe('product compatibility', () => {
  it('reads a together rule both ways and a succession rule one way', () => {
    const reversed = { ...keroseneWithPetrol, productANo: 'PRD-007', productBNo: 'PRD-008' }
    expect(sameRule(keroseneWithPetrol, reversed)).toBe(true)
    const backwards = { ...dieselAfterPetrol, productANo: 'PRD-006', productBNo: 'PRD-007' }
    expect(sameRule(dieselAfterPetrol, backwards)).toBe(false)
  })

  it('finds products that cannot travel together', () => {
    expect(forbiddenTogether(rules, ['PRD-007', 'PRD-008', 'PRD-001'])).toEqual([
      keroseneWithPetrol
    ])
    expect(forbiddenTogether(rules, ['PRD-006', 'PRD-007'])).toEqual([])
    const inactive = { ...keroseneWithPetrol, active: false }
    expect(forbiddenTogether([inactive], ['PRD-007', 'PRD-008'])).toEqual([])
  })

  it('forbids a succession unless the compartment was cleaned', () => {
    expect(forbiddenSuccession(rules, 'PRD-007', 'PRD-006', false)).toBe(dieselAfterPetrol)
    expect(forbiddenSuccession(rules, 'PRD-007', 'PRD-006', true)).toBeNull()
    expect(forbiddenSuccession(rules, 'PRD-006', 'PRD-007', false)).toBeNull()
    expect(forbiddenSuccession(rules, null, 'PRD-006', false)).toBeNull()
  })
})
