import { describe, expect, it } from 'vitest'
import type { WorkingDay } from '../../working-calendar/domain/workingDays'
import { buildWeekPlanning } from './weekPlanning'

const calendar: WorkingDay[] = [1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => ({
  dayOfWeek,
  working: dayOfWeek < 7,
  start: '07:30',
  end: '16:30',
  hasBreak: true,
  breakStart: '12:00',
  breakEnd: '13:00'
}))

describe('buildWeekPlanning', () => {
  it('lays out the company hours from Monday to Sunday', () => {
    const week = buildWeekPlanning('2026-09-07', calendar, [], [])
    expect(week.map((day) => day.date)).toEqual([
      '2026-09-07',
      '2026-09-08',
      '2026-09-09',
      '2026-09-10',
      '2026-09-11',
      '2026-09-12',
      '2026-09-13'
    ])
    expect(week[0]).toMatchObject({ working: true, minutes: 480, holiday: null, leave: null })
    expect(week[6]).toMatchObject({ working: false, minutes: 0 })
  })

  it('marks recurring holidays as days off, whatever the year they were entered', () => {
    const week = buildWeekPlanning(
      '2027-06-21',
      calendar,
      [{ date: '2026-06-26', recurring: true, name: "Fête de l'Indépendance" }],
      []
    )
    expect(week[5]).toMatchObject({ holiday: "Fête de l'Indépendance", working: false, minutes: 0 })
  })

  it('shows approved and pending leave, but not rejected requests', () => {
    const week = buildWeekPlanning(
      '2026-09-07',
      calendar,
      [],
      [
        {
          no: 'LR-1',
          leaveTypeName: 'Congé annuel',
          status: 'approved',
          startDate: '2026-09-08',
          endDate: '2026-09-09'
        },
        {
          no: 'LR-2',
          leaveTypeName: 'Récupération',
          status: 'rejected',
          startDate: '2026-09-10',
          endDate: '2026-09-10'
        }
      ]
    )
    expect(week[1]?.leave).toMatchObject({ no: 'LR-1', status: 'approved' })
    expect(week[2]?.leave?.no).toBe('LR-1')
    expect(week[3]?.leave).toBeNull()
  })
})
