import { describe, expect, it } from 'vitest'
import { closureBlocks, indemnityIssues, nextInsuranceStatuses, residualCost } from './claim'

describe('nextInsuranceStatuses', () => {
  it('moves forward one step at a time', () => {
    expect(nextInsuranceStatuses('not_declared')).toEqual(['declared'])
    expect(nextInsuranceStatuses('assessment')).toEqual(['accepted', 'refused'])
    expect(nextInsuranceStatuses('settled')).toEqual([])
    expect(nextInsuranceStatuses('refused')).toEqual([])
  })
})

describe('indemnityIssues', () => {
  it('asks for an indemnity once accepted, never above the damage', () => {
    expect(indemnityIssues('assessment', null, 1000)).toEqual([])
    expect(indemnityIssues('accepted', null, 1000)).toEqual(['indemnityRequired'])
    expect(indemnityIssues('settled', 1200, 1000)).toEqual(['indemnityAboveDamage'])
    expect(indemnityIssues('settled', 800, 1000)).toEqual([])
  })
})

describe('residualCost', () => {
  it('is what the insurer leaves to the company', () => {
    expect(residualCost(1000, 800)).toBe(200)
    expect(residualCost(1000, null)).toBe(1000)
    expect(residualCost(null, null)).toBe(0)
  })
})

describe('closureBlocks', () => {
  const ready = {
    status: 'open' as const,
    analysis: 'Freinage tardif.',
    liability: 'company',
    insuranceStatus: 'settled' as const
  }

  it('closes a file analysed, with a known liability and no insurer decision pending', () => {
    expect(closureBlocks(ready)).toEqual([])
    expect(closureBlocks({ ...ready, insuranceStatus: 'not_declared' })).toEqual([])
  })

  it('lists everything still missing', () => {
    expect(
      closureBlocks({
        ...ready,
        analysis: ' ',
        liability: 'to_determine',
        insuranceStatus: 'assessment'
      })
    ).toEqual(['analysisRequired', 'liabilityUndetermined', 'insurancePending'])
    expect(closureBlocks({ ...ready, repairOpen: true })).toEqual(['repairOpen'])
    expect(closureBlocks({ ...ready, status: 'closed' })).toEqual(['alreadyClosed'])
  })
})
