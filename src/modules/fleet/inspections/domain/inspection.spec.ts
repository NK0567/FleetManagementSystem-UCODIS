import { describe, expect, it } from 'vitest'
import { awaitsRecheck, inspectionState, recheckDueOn } from './inspection'

const failed = { inspectedOn: '2026-09-01', result: 'non_conforming' as const, recheckDoneOn: null }

describe('inspections', () => {
  it('give a non-conforming vehicle the set delay to be re-inspected', () => {
    expect(recheckDueOn(failed, 15)).toBe('2026-09-16')
    expect(recheckDueOn({ ...failed, result: 'conforming' }, 15)).toBeNull()
  })

  it('follow the re-inspection', () => {
    expect(inspectionState(failed, 15, '2026-09-10')).toBe('recheck_pending')
    expect(inspectionState(failed, 15, '2026-09-17')).toBe('recheck_overdue')
    expect(inspectionState({ ...failed, recheckDoneOn: '2026-09-12' }, 15, '2026-09-20')).toBe(
      'rechecked'
    )
    expect(inspectionState({ ...failed, result: 'conforming' }, 15, '2026-09-20')).toBe(
      'conforming'
    )
  })

  it('keep the vehicle off the road until it is re-inspected', () => {
    expect(awaitsRecheck(failed)).toBe(true)
    expect(awaitsRecheck({ ...failed, recheckDoneOn: '2026-09-12' })).toBe(false)
  })
})
