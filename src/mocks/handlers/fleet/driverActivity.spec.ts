import { beforeEach, describe, expect, it } from 'vitest'
import type { DriverActivityApi } from '@/modules/fleet/drivers/types/driver.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const activity = (no: string) =>
  call(server, 'get', `/fleet/drivers/${no}/activity`, { as: 'FLT001', language: 'en' })

describe('driver activity', () => {
  it('gathers the trips, refills, deviations, infractions and trainings of the driver', async () => {
    const jaona = (await activity('UCT-013')).data.data as DriverActivityApi
    expect(jaona.trips.map((trip) => trip.no)).toEqual(['TRP-00008', 'TRP-00003'])
    expect(jaona).toMatchObject({ periodDays: 30, tripsFinished: 1, kmDriven: 361 })
    expect(jaona.deviations).toEqual([
      expect.objectContaining({ no: 'ECA-00002', tripNo: 'TRP-00003', nature: 'unjustified' })
    ])
    expect(jaona.infractions.map((infraction) => infraction.no)).toContain('INF-2026-001')
    expect(jaona.refills.every((refill) => refill.vehiclePlate)).toBe(true)
    expect(jaona.litersRefueled).toBeGreaterThan(0)
  })

  it('answers 404 for someone who does not drive', async () => {
    expect((await activity('UCT-001')).status).toBe(404)
  })
})
