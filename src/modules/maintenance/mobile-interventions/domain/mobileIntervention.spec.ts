import { describe, expect, it } from 'vitest'
import { mobileInterventionStatus, mobileKpis } from './mobileIntervention'

const base = {
  departedAt: '2026-09-02T08:00:00',
  arrivedAt: '2026-09-02T08:40:00',
  closedAt: '2026-09-02T10:00:00',
  resolved: true,
  isControl: false,
  checkCount: null,
  positiveCount: null
}

describe('mobile interventions', () => {
  it('derive the status from arrival and closing', () => {
    expect(mobileInterventionStatus({ arrivedAt: null, closedAt: null, resolved: null })).toBe(
      'en_route'
    )
    expect(mobileInterventionStatus({ ...base, closedAt: null })).toBe('on_site')
    expect(mobileInterventionStatus(base)).toBe('resolved')
    expect(mobileInterventionStatus({ ...base, resolved: false })).toBe('unresolved')
  })

  it('measure a calendar month, leaving control missions out of the resolution rate', () => {
    const kpis = mobileKpis(
      [
        base,
        {
          ...base,
          resolved: false,
          arrivedAt: '2026-09-02T09:00:00',
          closedAt: '2026-09-02T12:00:00'
        },
        { ...base, isControl: true, resolved: false, checkCount: 14, positiveCount: 1 },
        { ...base, departedAt: '2026-08-31T23:00:00' }
      ],
      '2026-09'
    )
    expect(kpis).toEqual({
      interventions: 3,
      resolutionRate: 50,
      averageTimeMin: 160,
      averageDelayMin: 47,
      checks: 14,
      positives: 1
    })
  })
})
