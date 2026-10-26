import { beforeEach, describe, expect, it } from 'vitest'
import type { AvailabilityApi } from '@/modules/fleet/trips/types/availability.types'
import { seedAudit } from '../../fixtures/seedAudit'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

async function availability(from: string, to: string, as = 'FLT001') {
  const response = await call(server, 'get', '/fleet/availability', {
    as,
    language: 'en',
    query: { from, to }
  })
  return response
}

const read = async (from: string, to: string) =>
  (await availability(from, to)).data.data as AvailabilityApi

describe('availability over a time window', () => {
  it('frees a vehicle booked for a later day and holds it on that day', async () => {
    // TRP-00008 takes VEH-004 from 2026-09-05 06:00.
    const today = await read('2026-09-04T08:00:00', '2026-09-04T12:00:00')
    expect(today.vehicles.find((vehicle) => vehicle.no === 'VEH-004')).toMatchObject({
      available: true,
      reasons: []
    })
    const tomorrow = await read('2026-09-05T07:00:00', '2026-09-05T09:00:00')
    const held = tomorrow.vehicles.find((vehicle) => vehicle.no === 'VEH-004')
    expect(held?.available).toBe(false)
    expect(held?.reasons.join(' ')).toContain('TRP-00008')
  })

  it('reads the load from the trailer and gives none to a tractor', async () => {
    const window = await read('2026-09-10T08:00:00', '2026-09-10T12:00:00')
    const tractors = window.vehicles.filter((vehicle) => vehicle.role === 'motorized')
    const trailers = window.vehicles.filter((vehicle) => vehicle.role === 'towed')
    expect(tractors.length).toBeGreaterThan(0)
    expect(tractors.every((vehicle) => vehicle.capacity === null)).toBe(true)
    expect(trailers.every((vehicle) => vehicle.capacity !== null)).toBe(true)
  })

  it('counts a leave on any day of the trip, not only on departure', async () => {
    const before = await read('2026-09-14T06:00:00', '2026-09-16T18:00:00')
    const driver = before.drivers.find((candidate) => candidate.available)
    expect(driver).toBeDefined()
    server.db.leaveRequests.insert({
      no: 'LR-TEST',
      employeeNo: driver?.no ?? '',
      leaveTypeNo: 'CP',
      startDate: '2026-09-16',
      endDate: '2026-09-18',
      status: 'approved',
      reason: '',
      submittedAt: '2026-09-01T08:00:00',
      decisionComment: '',
      decidedAt: '2026-09-02T08:00:00',
      decidedBy: 'FLT001',
      ...seedAudit
    })
    const after = await read('2026-09-14T06:00:00', '2026-09-16T18:00:00')
    const onLeave = after.drivers.find((candidate) => candidate.no === driver?.no)
    expect(onLeave?.available).toBe(false)
    const firstDay = await read('2026-09-14T06:00:00', '2026-09-14T18:00:00')
    expect(firstDay.drivers.find((candidate) => candidate.no === driver?.no)?.available).toBe(true)
  })

  it('refuses a reversed window and a profile without trips', async () => {
    expect((await availability('2026-09-05T08:00:00', '2026-09-04T08:00:00')).status).toBe(400)
    expect(
      (await availability('2026-09-04T08:00:00', '2026-09-04T12:00:00', 'CND001')).status
    ).toBe(403)
  })
})
