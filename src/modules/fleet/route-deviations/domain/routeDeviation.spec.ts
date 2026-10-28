import { describe, expect, it } from 'vitest'
import {
  allowedDecisions,
  complianceRate,
  deviationNature,
  justificationDeadline
} from './routeDeviation'

describe('route deviations', () => {
  it('stay to qualify until someone qualifies them', () => {
    expect(deviationNature(null)).toBe('to_qualify')
    expect(
      deviationNature({
        nature: 'endured',
        decision: 'dismissed',
        reason: 'x',
        by: 'FLT001',
        at: ''
      })
    ).toBe('endured')
  })

  it('only sanction an unjustified deviation', () => {
    expect(allowedDecisions('unjustified')).toEqual(['dismissed', 'warning', 'sanction'])
    expect(allowedDecisions('authorized')).toEqual(['dismissed'])
    expect(allowedDecisions('endured')).toEqual(['dismissed'])
  })

  it('are justified within the set delay', () => {
    expect(justificationDeadline('2026-09-04T08:10:00', 48)).toBe('2026-09-06T08:10:00')
  })
})

describe('complianceRate', () => {
  it('counts finished trips with no unjustified deviation', () => {
    expect(complianceRate(['T1', 'T2', 'T3', 'T4'], new Set(['T2']))).toBe(75)
    expect(complianceRate([], new Set())).toBeNull()
  })
})
