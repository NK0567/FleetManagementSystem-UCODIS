import { beforeEach, describe, expect, it } from 'vitest'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'
import type { WorkingCalendarApi } from '@/modules/hr/working-calendar/types/workingCalendar.types'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

async function readCalendar(as = 'ADM001') {
  return (await call(server, 'get', '/hr/working-calendar', { as })).data.data as WorkingCalendarApi
}

describe('working calendar endpoints', () => {
  it('serves the seven days in order with the weekly total', async () => {
    const calendar = await readCalendar('CLI001')
    expect(calendar.days.map((day) => day.dayOfWeek)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(calendar.weeklyMinutes).toBe(6 * 8 * 60)
  })

  it('replaces the week and records who changed it', async () => {
    const { days } = await readCalendar()
    const saturdayOff = days.map((day) => (day.dayOfWeek === 6 ? { ...day, working: false } : day))
    const response = await call(server, 'put', '/hr/working-calendar', {
      as: 'FLT001',
      body: { days: saturdayOff }
    })
    expect(response.data.data).toMatchObject({ weeklyMinutes: 5 * 8 * 60, modifiedBy: 'FLT001' })
  })

  it('refuses an incomplete week and inconsistent hours', async () => {
    const { days } = await readCalendar()
    const incomplete = await call(server, 'put', '/hr/working-calendar', {
      as: 'ADM001',
      body: { days: days.slice(1) }
    })
    const reversed = await call(server, 'put', '/hr/working-calendar', {
      as: 'ADM001',
      body: { days: days.map((day) => (day.dayOfWeek === 2 ? { ...day, end: '06:00' } : day)) }
    })
    expect(incomplete.status).toBe(422)
    expect(reversed.status).toBe(422)
    expect(reversed.data.message).toContain('2')
  })

  it('leaves the calendar read-only for back-office staff', async () => {
    const { days } = await readCalendar()
    const response = await call(server, 'put', '/hr/working-calendar', {
      as: 'CLI001',
      body: { days }
    })
    expect(response.status).toBe(403)
  })
})
