import { beforeEach, describe, expect, it } from 'vitest'
import type { DriverApi } from '@/modules/fleet/drivers/types/driver.types'
import type { RouteTemplateApi } from '@/modules/fleet/route-templates/types/routeTemplate.types'
import type { TripApi } from '@/modules/fleet/trips/types/trip.types'
import type { VehicleApi } from '@/modules/fleet/vehicles/types/vehicle.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

async function get<T>(path: string) {
  return (await call(server, 'get', path, { as: 'FLT001', language: 'en' })).data.data as T
}

const plan = (body: Record<string, unknown>) =>
  call(server, 'post', '/fleet/trips', {
    as: 'FLT001',
    language: 'en',
    body: {
      routeTemplateNo: 'TNR-ATS',
      vehicleNo: 'VEH-001',
      trailerNo: 'VEH-011',
      driverNo: 'UCT-010',
      plannedDeparture: '2030-01-10T06:00',
      ...body
    }
  })

const act = (no: string, name: string, body: Record<string, unknown> = {}) =>
  call(server, 'post', `/fleet/trips/${no}/${name}`, { as: 'FLT001', language: 'en', body })

describe('trips on the road', () => {
  it('put the vehicle in mission and the driver on trip', async () => {
    expect(await get<VehicleApi>('/fleet/vehicles/VEH-003')).toMatchObject({
      status: 'in_mission',
      statusReason: 'On trip (TRP-00006)'
    })
    expect((await get<DriverApi>('/fleet/drivers/UCT-012')).availability).toBe('on_trip')
  })

  it('derive the planned times from the route and the departure', async () => {
    const trip = await get<TripApi>('/fleet/trips/TRP-00006')
    expect(trip.stops.map((stop) => stop.plannedAt)).toEqual([
      '2026-09-04T06:00:00',
      '2026-09-04T06:25:00',
      '2026-09-04T08:45:00',
      '2026-09-04T10:55:00',
      '2026-09-04T13:30:00'
    ])
    expect(trip).toMatchObject({ passedStopCount: 2, stopCount: 5, distanceKm: null })
  })

  it('keep their vehicle and driver from being released', async () => {
    const uncouple = await call(server, 'post', '/fleet/couplings/CPL-0003/end', {
      as: 'FLT001',
      body: { endDate: '2026-09-04' }
    })
    expect(uncouple.status).toBe(409)
    const outOfService = await call(server, 'post', '/fleet/vehicles/VEH-003/out-of-service', {
      as: 'FLT001',
      body: { reason: 'Panne' }
    })
    expect(outOfService.status).toBe(409)
  })
})

describe('planning a trip', () => {
  it('copies the stops of the route and the reference distance', async () => {
    const response = await plan({})
    expect(response.status).toBe(201)
    const trip = response.data.data as TripApi
    expect(trip).toMatchObject({
      no: 'TRP-00010',
      status: 'planned',
      referenceKm: 168,
      plannedArrival: '2030-01-10T09:30:00'
    })
    expect(trip.stops.map((stop) => stop.siteNo)).toEqual(['DEP-TNJ', 'STA-AMB', 'ENT-ATS'])
  })

  it('refuses a vehicle or a driver already taken at that time', async () => {
    await plan({})
    const sameVehicle = await plan({ driverNo: 'UCT-014', trailerNo: null })
    expect(sameVehicle.status).toBe(409)
    expect(sameVehicle.data.message).toContain('4021 TBA')
    const sameDriver = await plan({ vehicleNo: 'VEH-002', trailerNo: null })
    expect(sameDriver.status).toBe(409)
    const later = await plan({ plannedDeparture: '2030-01-10T09:30' })
    expect(later.status).toBe(201)
  })

  it('refuses an ineligible driver, an unusable vehicle and a past departure', async () => {
    expect((await plan({ driverNo: 'UCT-016' })).status).toBe(422)
    expect((await plan({ vehicleNo: 'VEH-009', trailerNo: null })).status).toBe(422)
    expect((await plan({ plannedDeparture: '2020-01-01T06:00' })).status).toBe(422)
  })

  it('lets a planned trip change, and only a planned one', async () => {
    const edited = await call(server, 'patch', '/fleet/trips/TRP-00008', {
      as: 'FLT001',
      body: { plannedDeparture: '2030-02-01T07:00' }
    })
    expect(edited.status).toBe(200)
    const closed = await call(server, 'patch', '/fleet/trips/TRP-00002', {
      as: 'FLT001',
      body: { plannedDeparture: '2030-02-01T07:00' }
    })
    expect(closed.status).toBe(409)
  })
})

describe('trip actions', () => {
  it('runs a trip from start to closure and records the mileage on the vehicle', async () => {
    const created = (await plan({})).data.data as TripApi
    expect((await act(created.no, 'start', {})).status).toBe(200)
    expect((await get<VehicleApi>('/fleet/vehicles/VEH-001')).status).toBe('in_mission')
    expect((await act(created.no, 'pass-stop')).status).toBe(200)
    expect((await act(created.no, 'pass-stop')).status).toBe(422)

    expect((await act(created.no, 'complete', { endOdometerKm: 182000 })).status).toBe(422)
    const completed = (await act(created.no, 'complete', { endOdometerKm: 182575 })).data
      .data as TripApi
    expect(completed).toMatchObject({ status: 'completed', distanceKm: 175, kmGapPercent: 4.2 })
    expect((await get<VehicleApi>('/fleet/vehicles/VEH-001')).odometerKm).toBe(182575)

    expect((await act(created.no, 'close')).data.data).toMatchObject({
      status: 'closed',
      closedBy: 'FLT001'
    })
  })

  it('refuses to start a trip whose vehicle is already on the road', async () => {
    const response = await plan({
      vehicleNo: 'VEH-003',
      trailerNo: null,
      driverNo: 'UCT-014',
      plannedDeparture: '2030-03-01T06:00'
    })
    expect(response.status).toBe(409)
  })

  it('cancels a planned trip with a reason only', async () => {
    expect((await act('TRP-00008', 'cancel', {})).status).toBe(422)
    expect((await act('TRP-00008', 'cancel', { reason: 'Report' })).data.data).toMatchObject({
      status: 'cancelled'
    })
    expect((await act('TRP-00006', 'cancel', { reason: 'Panne' })).status).toBe(409)
  })

  it('keeps a route followed by trips', async () => {
    const routes = (await get<{ items: RouteTemplateApi[] }>('/fleet/route-templates')).items
    expect(routes.find((route) => route.no === 'TNR-TOA')).toMatchObject({
      tripCount: 3,
      plannedDurationMin: 450,
      originName: 'Dépôt Tanjombato'
    })
    expect(
      (await call(server, 'delete', '/fleet/route-templates/TNR-TOA', { as: 'FLT001' })).status
    ).toBe(409)
  })
})
