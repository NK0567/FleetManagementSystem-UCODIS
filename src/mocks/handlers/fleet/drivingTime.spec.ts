import { beforeEach, describe, expect, it } from 'vitest'
import type { ClaimApi } from '@/modules/fleet/claims/types/claim.types'
import type { CompanyDocumentApi } from '@/modules/fleet/company-documents/types/companyDocument.types'
import type { DepartureAuthorizationApi } from '@/modules/fleet/departure-authorizations/types/departureAuthorization.types'
import type {
  DriverDrivingTimeApi,
  TripDrivingTimeApi
} from '@/modules/fleet/trips/types/drivingTime.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const get = async <T>(path: string, as = 'FLT001') =>
  (await call(server, 'get', path, { as })).data.data as T

describe('driving time', () => {
  it('is checked on the trip, from its passages or from its plan', async () => {
    const done = await get<TripDrivingTimeApi>('/fleet/trips/TRP-00002/driving-time')
    expect(done.source).toBe('actual')
    expect(done.breaches.map((breach) => breach.code)).toEqual(['continuous', 'daily'])
    const planned = await get<TripDrivingTimeApi>('/fleet/trips/TRP-00007/driving-time')
    expect(planned.source).toBe('planned')
    expect(planned.breaches.map((breach) => breach.code)).toContain('night')
    expect((await get<TripDrivingTimeApi>('/fleet/trips/TRP-00003/driving-time')).breaches).toEqual(
      []
    )
  })

  it('follows the limits of the settings, and shows on the driver record', async () => {
    const settings = (await call(server, 'get', '/fleet/settings', { as: 'ADM001' })).data.data as {
      drivingTime: Record<string, unknown>
    }
    await call(server, 'put', '/fleet/settings/drivingTime', {
      as: 'ADM001',
      body: { ...settings.drivingTime, continuousDrivingMaxMin: 360, dailyDrivingMaxMin: 720 }
    })
    expect(
      (await get<TripDrivingTimeApi>('/fleet/trips/TRP-00002/driving-time')).breaches.map(
        (b) => b.code
      )
    ).toEqual(['continuous'])
    const driver = await get<DriverDrivingTimeApi>('/fleet/drivers/UCT-011/driving-time')
    expect(driver.trips.map((trip) => trip.tripNo)).toContain('TRP-00002')
    expect(
      (await call(server, 'get', '/fleet/drivers/UCT-011/driving-time', { as: 'CND001' })).status
    ).toBe(403)
  })
})

describe('departure grant', () => {
  it('switches on the GPS tracking and the camera of the vehicle', async () => {
    const pending = await get<DepartureAuthorizationApi>(
      '/fleet/departure-authorizations/AUT-2026-0007'
    )
    expect(pending.activation).toBeNull()
    const granted = (
      await call(server, 'post', '/fleet/departure-authorizations/AUT-2026-0007/grant', {
        as: 'FLT001'
      })
    ).data.data as DepartureAuthorizationApi
    expect(granted.activation).toMatchObject({ gps: 'activated', camera: 'activated' })
  })

  it('says so when the vehicle has no tracker', async () => {
    server.db.vehicleEquipment
      .all()
      .filter((item) => item.vehicleNo === 'VEH-007')
      .forEach((item) => server.db.vehicleEquipment.update(item.no, { state: 'out_of_service' }))
    const granted = (
      await call(server, 'post', '/fleet/departure-authorizations/AUT-2026-0007/grant', {
        as: 'FLT001'
      })
    ).data.data as DepartureAuthorizationApi
    expect(granted.activation).toMatchObject({ gps: 'no_unit', camera: 'no_camera' })
  })
})

describe('accident record', () => {
  it('shows the work order and the unavailability code put on the vehicle', async () => {
    const open = server.db.claims.all().find((row) => row.status !== 'closed')!
    const opened = await call(server, 'post', '/maintenance/work-orders/from-source', {
      as: 'FLT001',
      body: { origin: 'claim', originNo: open.no }
    })
    expect([200, 201]).toContain(opened.status)
    const claim = await get<ClaimApi>(`/fleet/claims/${open.no}`)
    expect(claim).toMatchObject({ downtimeCode: 'ACC', downtimeOpen: true })
    expect(claim.downtimeCodeName).toBe('Accident')
  })
})

describe('company documents', () => {
  it('are searched by the day they were filed', async () => {
    const list = async (filters: unknown[]) =>
      (
        (
          await call(server, 'get', '/fleet/company-documents', {
            as: 'ADM001',
            query: { pageSize: 200, filters: JSON.stringify(filters) }
          })
        ).data.data as { items: CompanyDocumentApi[] }
      ).items
    const all = await list([])
    const day = all[0]!.filedOn
    const sameDay = await list([{ field: 'filedOn', valueType: 'date', value: day }])
    expect(sameDay.length).toBeGreaterThan(0)
    expect(sameDay.every((row) => row.filedOn === day)).toBe(true)
  })
})
