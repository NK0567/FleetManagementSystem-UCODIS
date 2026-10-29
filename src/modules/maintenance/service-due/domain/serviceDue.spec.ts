import { describe, expect, it } from 'vitest'
import { needsService, serviceDue } from './serviceDue'

const thresholds = { noticeKm: 1_000, noticeDays: 15, noticeHours: 50 }
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

  it('counts engine hours from the hour meter, as a third threshold', () => {
    const byHours = { intervalKm: 10_000, intervalHours: 500, intervalDays: null }
    const last = { km: 40_000, hours: 2_000, date: null }
    const at = (hours: number | null) =>
      serviceDue(byHours, last, { km: 41_000, today, hours }, thresholds, false)
    expect(at(2_300)).toMatchObject({ nextHours: 2_500, hoursRemaining: 200, status: 'upcoming' })
    expect(at(2_460).status).toBe('due_soon')
    expect(at(2_510).status).toBe('blocking')
    expect(at(null)).toMatchObject({ hoursRemaining: null, status: 'upcoming' })
  })

  it('blocks as soon as it is past due, but never on a provisional plan', () => {
    const at = (km: number, provisional = false) =>
      serviceDue(byKm, { km: 40_000, date: null }, { km, today }, thresholds, provisional).status
    expect(at(49_100)).toBe('due_soon')
    expect(at(50_000)).toBe('due_soon')
    expect(at(50_001)).toBe('blocking')
    expect(at(50_400, true)).toBe('overdue')
  })

  it('asks for a service from the notice on', () => {
    expect(needsService('upcoming')).toBe(false)
    expect(needsService('unknown')).toBe(false)
    expect(needsService('due_soon')).toBe(true)
    expect(needsService('blocking')).toBe(true)
  })
})
