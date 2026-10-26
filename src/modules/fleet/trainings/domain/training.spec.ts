import { describe, expect, it } from 'vitest'
import { isPending, isSameTraining, trainingStatus } from './training'

describe('trainingStatus', () => {
  const none = { plannedOn: null, attendedOn: null, cancelledAt: null }

  it('derives from the facts', () => {
    expect(trainingStatus(none)).toBe('to_plan')
    expect(trainingStatus({ ...none, plannedOn: '2026-09-10' })).toBe('planned')
    expect(trainingStatus({ ...none, plannedOn: '2026-09-10', attendedOn: '2026-09-10' })).toBe(
      'attended'
    )
    expect(trainingStatus({ ...none, cancelledAt: '2026-09-02T08:00:00.000Z' })).toBe('cancelled')
  })

  it('keeps only planned or unplanned trainings pending', () => {
    expect(isPending('planned')).toBe(true)
    expect(isPending('attended')).toBe(false)
  })
})

describe('isSameTraining', () => {
  const triggered = { employeeNo: 'UCT-013', originNo: 'INF-2026-001' }

  it('trains a driver once per origin, unless the first one was cancelled', () => {
    expect(isSameTraining(triggered, { ...triggered, status: 'planned' })).toBe(true)
    expect(isSameTraining(triggered, { ...triggered, status: 'cancelled' })).toBe(false)
    expect(
      isSameTraining(triggered, { ...triggered, employeeNo: 'UCT-011', status: 'planned' })
    ).toBe(false)
    expect(
      isSameTraining(
        { ...triggered, originNo: '' },
        { ...triggered, originNo: '', status: 'planned' }
      )
    ).toBe(false)
  })
})
