import { describe, expect, it } from 'vitest'
import { needsService, serviceDue } from './serviceDue'

const thresholds = { noticeKm: 1_000, noticeDays: 15, toleranceKm: 500, toleranceDays: 7 }
const today = '2026-09-04'
const byKm = { intervalKm: 10_000, intervalDays: null }
const both = { intervalKm: 10_000, intervalDays: 180 }

describe('serviceDue', () => {
  it('stays unknown until a passage feeds one of its intervals', () => {
    expect(serviceDue(byKm, null, { km: 50_000, today }, thresholds, false).status).toBe('unknown')
    expect(
      serviceDue(byKm, { km: null, date: '2026-08-01' }, { km: 50_000, today }, thresholds, false)
        .status
    ).toBe('unknown')
  })

  it('counts down the km and the days, and the first reached wins', () => {
    const due = serviceDue(
      both,
      { km: 40_000, date: '2026-04-01' },
      { km: 45_000, today },
      thresholds,
      false
    )
    expect(due).toMatchObject({
      nextKm: 50_000,
      kmRemaining: 5_000,
      nextDate: '2026-09-28',
      daysRemaining: 24,
      status: 'upcoming'
    })
    expect(
      serviceDue(both, { km: 40_000, date: '2026-03-15' }, { km: 45_000, today }, thresholds, false)
        .status
    ).toBe('due_soon')
  })

  it('blocks past the tolerance, but never on a provisional plan', () => {
    const at = (km: number, provisional = false) =>
      serviceDue(byKm, { km: 40_000, date: null }, { km, today }, thresholds, provisional).status
    expect(at(49_100)).toBe('due_soon')
    expect(at(50_400)).toBe('overdue')
    expect(at(50_600)).toBe('blocking')
    expect(at(50_600, true)).toBe('overdue')
  })

  it('asks for a service from the notice on', () => {
    expect(needsService('upcoming')).toBe(false)
    expect(needsService('unknown')).toBe(false)
    expect(needsService('due_soon')).toBe(true)
    expect(needsService('blocking')).toBe(true)
  })
})
