import { describe, expect, it } from 'vitest'
import { contractIssues, isContractActive } from './provider'

const contract = {
  reference: 'CTR-001',
  subject: 'Assurance flotte',
  startDate: '2025-01-01',
  endDate: '2026-12-31',
  amount: 1000
}

describe('contractIssues', () => {
  it('accepts a complete contract', () => {
    expect(contractIssues(contract)).toEqual([])
  })

  it('reports a missing subject, an end before the start and a negative amount', () => {
    expect(
      contractIssues({ ...contract, subject: ' ', endDate: '2024-12-31', amount: -1 })
    ).toEqual(['subjectRequired', 'endBeforeStart', 'negativeAmount'])
  })
})

describe('isContractActive', () => {
  it('runs from its start to its end, both included', () => {
    expect(isContractActive(contract, '2025-01-01')).toBe(true)
    expect(isContractActive(contract, '2026-12-31')).toBe(true)
    expect(isContractActive(contract, '2027-01-01')).toBe(false)
  })

  it('runs without end when no end date is set', () => {
    expect(isContractActive({ ...contract, endDate: null }, '2040-01-01')).toBe(true)
  })
})
