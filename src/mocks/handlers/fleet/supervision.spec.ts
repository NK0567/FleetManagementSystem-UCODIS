import { beforeEach, describe, expect, it } from 'vitest'
import type { FleetDashboardApi } from '@/modules/fleet/dashboard/types/fleetDashboard.types'
import type {
  LivePositionApi,
  TrackHistoryApi,
  VehicleJournalApi
} from '@/modules/fleet/live-map/types/liveMap.types'
import type { RouteDeviationApi } from '@/modules/fleet/route-deviations/types/routeDeviation.types'
import type { TelematicsEventRow } from '../../fixtures/fleet/telematicsEvents'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const get = (path: string, query: Record<string, unknown> = {}, as = 'FLT001') =>
  call(server, 'get', path, { as, query, language: 'fr' })

async function positions(as = 'FLT001') {
  return (await get('/fleet/live/positions', {}, as)).data.data as LivePositionApi[]
}

async function deviations(tripNo: string) {
  const response = await get('/fleet/route-deviations', { pageSize: 200 })
  return (response.data.data as { items: RouteDeviationApi[] }).items.filter(
    (row) => row.tripNo === tripNo
  )
}

/** A reading of the unit of the vehicle on the road (TRP-00006, VEH-003). */
function reading(fields: Partial<TelematicsEventRow>) {
  const base = server.db.telematicsEvents.all()[0] as TelematicsEventRow
  server.db.telematicsEvents.insert({
    ...base,
    no: `TEL-9${String(server.db.telematicsEvents.all().length).padStart(5, '0')}`,
    vehicleNo: 'VEH-003',
    driverNo: 'UCT-012',
    tripNo: 'TRP-00006',
    source: 'box',
    detail: '',
    infractionNo: null,
    acknowledgedAt: null,
    acknowledgedBy: null,
    acknowledgementComment: '',
    ...fields
  } as TelematicsEventRow)
}

/** Sets when each stop of the trip on the road was passed. */
function passStops(passed: (string | null)[]) {
  const trip = server.db.trips.findOrFail('TRP-00006')
  server.db.trips.update(trip.no, {
    stops: trip.stops.map((stop, index) => ({ ...stop, passedAt: passed[index] ?? null }))
  })
}

describe('live map', () => {
  it('gives each tracked vehicle its position, speed, status, alerts and zone', async () => {
    const onRoad = (await positions()).find((row) => row.vehicleNo === 'VEH-003')
    expect(onRoad).toMatchObject({ situation: 'moving', tripNo: 'TRP-00006', outOfZone: false })
    expect(onRoad?.speedKmh).toBeGreaterThan(0)
    expect(onRoad?.alertCount).toBeGreaterThan(0)
    expect(onRoad?.corridorGapM).toBe(0)
  })

  it('puts out of zone a vehicle off a trip standing outside a site or in a restricted one', async () => {
    server.db.vehicles.update('VEH-001', { homeSiteNo: 'ZAR-RN2' })
    const parked = (await positions()).find((row) => row.vehicleNo === 'VEH-001')
    expect(parked).toMatchObject({ tripNo: null, outOfZone: true, corridorGapM: null })
  })

  it('stays closed to the profiles without the map', async () => {
    expect((await get('/fleet/live/positions', {}, 'CND001')).status).toBe(403)
    expect((await get('/fleet/live/positions', {}, 'PLN001')).status).toBe(403)
  })
})

describe('history of a vehicle', () => {
  it('replays the positions recorded over a period, in order and within its trips', async () => {
    const response = await get('/fleet/live/history/VEH-003', {
      from: '2026-09-04T00:00',
      to: '2026-09-04T23:59'
    })
    const history = response.data.data as TrackHistoryApi
    expect(history.tripNos).toEqual(['TRP-00006'])
    expect(history.points.length).toBeGreaterThan(5)
    expect(history.points[0]?.at).toBe('2026-09-04T06:05:00')
    // Nothing is recorded after now: the trip is still on the road.
    expect(history.points.at(-1)!.at <= '2026-09-04T10:00:00').toBe(true)
    const times = history.points.map((point) => point.at)
    expect([...times].sort()).toEqual(times)
  })

  it('records nothing in a dead zone and nothing outside the trips', async () => {
    const completed = (
      await get('/fleet/live/history/VEH-001', {
        from: '2026-08-24T00:00',
        to: '2026-08-24T23:59'
      })
    ).data.data as TrackHistoryApi
    expect(completed.tripNos).toEqual(['TRP-00001'])
    // Beforona (RN2) has no coverage: the unit cannot report from there.
    expect(
      completed.points.some(
        (point) =>
          Math.abs(point.latitude + 18.8133) < 0.05 && Math.abs(point.longitude - 48.4058) < 0.05
      )
    ).toBe(false)
    const idle = (
      await get('/fleet/live/history/VEH-001', {
        from: '2026-07-01T00:00',
        to: '2026-07-02T00:00'
      })
    ).data.data as TrackHistoryApi
    expect(idle.points).toEqual([])
  })

  it('refuses a period upside down or too long, and an unknown vehicle', async () => {
    const reversed = await get('/fleet/live/history/VEH-003', {
      from: '2026-09-04T12:00',
      to: '2026-09-04T08:00'
    })
    expect(reversed.status).toBe(422)
    const tooLong = await get('/fleet/live/history/VEH-003', {
      from: '2026-06-01T00:00',
      to: '2026-09-04T00:00'
    })
    expect(tooLong.status).toBe(422)
    expect((await get('/fleet/live/history/VEH-003', { from: '2026-09-04T00:00' })).status).toBe(
      400
    )
    expect(
      (
        await get('/fleet/live/history/VEH-999', {
          from: '2026-09-04T00:00',
          to: '2026-09-04T10:00'
        })
      ).status
    ).toBe(404)
  })
})

describe('telematics journal of a vehicle', () => {
  it('lists the events and deviations of the period, newest first', async () => {
    const journal = (
      await get('/fleet/telematics-journal/VEH-001', {
        from: '2026-08-24T00:00',
        to: '2026-08-24T23:59'
      })
    ).data.data as VehicleJournalApi
    const kinds = new Set(journal.entries.map((entry) => entry.kind))
    expect(kinds).toEqual(new Set(['telematics', 'deviation']))
    expect(journal.entries.some((entry) => entry.family === 'behavior')).toBe(true)
    const times = journal.entries.map((entry) => entry.at)
    expect([...times].sort().reverse()).toEqual(times)
    expect(journal.entries.every((entry) => entry.at.startsWith('2026-08-24'))).toBe(true)
  })

  it('is read with the telematics right only', async () => {
    const query = { from: '2026-08-24T00:00', to: '2026-08-24T23:59' }
    expect((await get('/fleet/telematics-journal/VEH-001', query, 'DIR001')).status).toBe(200)
    expect((await get('/fleet/telematics-journal/VEH-001', query, 'PLN001')).status).toBe(403)
  })
})

describe('deviations found on the trips', () => {
  it('finds a missed point and a passing order not kept, each one to qualify', async () => {
    passStops(['2026-09-04T06:05:00', '2026-09-04T06:32:00', null, '2026-09-04T09:40:00'])
    await positions()
    const missed = (await deviations('TRP-00006')).filter(
      (row) => row.deviationTypeNo === 'MISSED-STOP'
    )
    expect(missed).toHaveLength(1)
    expect(missed[0]).toMatchObject({
      source: 'telematics',
      nature: 'to_qualify',
      qualification: null,
      location: 'Relais Moramanga'
    })

    passStops([
      '2026-09-04T06:05:00',
      '2026-09-04T06:32:00',
      '2026-09-04T09:50:00',
      '2026-09-04T09:30:00'
    ])
    await positions()
    const order = (await deviations('TRP-00006')).filter(
      (row) => row.deviationTypeNo === 'STOP-ORDER'
    )
    expect(order).toHaveLength(1)
    expect(order[0]?.nature).toBe('to_qualify')
  })

  it('finds a trip running past its planned time beyond the threshold', async () => {
    server.db.trips.update('TRP-00006', { actualDeparture: '2026-09-03T20:00:00' })
    await positions()
    const late = (await deviations('TRP-00006')).find((row) => row.deviationTypeNo === 'TRIP-TIME')
    expect(late?.measure).toBeGreaterThan(30)
    expect(late?.nature).toBe('to_qualify')
  })

  it('tells a stop outside an authorized point from a rest outside a designated parking', async () => {
    const before = new Set((await deviations('TRP-00006')).map((row) => row.no))
    reading({
      eventTypeNo: 'LONG-STOP',
      occurredAt: '2026-09-04T08:30:00',
      value: 35,
      latitude: -18.925,
      longitude: 47.75
    })
    reading({
      eventTypeNo: 'LONG-STOP',
      occurredAt: '2026-09-04T09:00:00',
      value: 75,
      latitude: -18.925,
      longitude: 47.76
    })
    // A long stop at the relay of the trip, where rest is allowed: nothing to say.
    reading({
      eventTypeNo: 'LONG-STOP',
      occurredAt: '2026-09-04T09:40:00',
      value: 70,
      latitude: -18.9333,
      longitude: 47.9333
    })
    // Below the threshold of the type: nothing either.
    reading({
      eventTypeNo: 'LONG-STOP',
      occurredAt: '2026-09-04T07:30:00',
      value: 10,
      latitude: -18.925,
      longitude: 47.7
    })
    await positions()
    const found = (await deviations('TRP-00006')).filter(
      (row) => !before.has(row.no) && ['UNPLANNED-STOP', 'REST-PLACE'].includes(row.deviationTypeNo)
    )
    expect(found.every((row) => row.nature === 'to_qualify' && row.source === 'telematics')).toBe(
      true
    )
    expect(found.map((row) => [row.deviationTypeNo, row.measure])).toEqual([
      ['UNPLANNED-STOP', 35],
      ['REST-PLACE', 75]
    ])
  })

  it('finds an exit of the corridor once per trip, at its first reading', async () => {
    reading({
      eventTypeNo: 'SPEEDING',
      occurredAt: '2026-09-04T08:45:00',
      value: 95,
      latitude: -18.6,
      longitude: 47.75
    })
    reading({
      eventTypeNo: 'SPEEDING',
      occurredAt: '2026-09-04T08:55:00',
      value: 96,
      latitude: -18.55,
      longitude: 47.76
    })
    await positions()
    await positions()
    const exits = (await deviations('TRP-00006')).filter(
      (row) => row.deviationTypeNo === 'OFF-ROUTE'
    )
    expect(exits).toHaveLength(1)
    expect(exits[0]?.detectedAt).toBe('2026-09-04T08:45:00')
    expect(exits[0]?.measure).toBeGreaterThan(3000)
  })

  it('records nothing twice, nothing for an inactive type and nothing on a closed trip', async () => {
    passStops(['2026-09-04T06:05:00', '2026-09-04T06:32:00', null, '2026-09-04T09:40:00'])
    server.db.deviationTypes.update('STOP-ORDER', { active: false })
    await positions()
    await positions()
    const rows = await deviations('TRP-00006')
    expect(rows.filter((row) => row.deviationTypeNo === 'MISSED-STOP')).toHaveLength(1)
    expect(
      rows.some((row) => row.deviationTypeNo === 'STOP-ORDER' && row.createdBy === 'SYSTEM')
    ).toBe(false)
    const closedBefore = (await deviations('TRP-00002')).length
    await positions()
    expect((await deviations('TRP-00002')).length).toBe(closedBefore)
  })
})

describe('control room board and park dashboard', () => {
  it('lists the vehicles on a mission, standing still, in alert and out of zone', async () => {
    server.db.vehicles.update('VEH-001', { homeSiteNo: 'ZAR-RN2' })
    const dashboard = (await get('/fleet/dashboard')).data.data as FleetDashboardApi
    const nos = (group: keyof FleetDashboardApi['supervision']) =>
      dashboard.supervision[group].map((row) => row.vehicleNo)
    expect(nos('onMission')).toEqual(['VEH-003'])
    expect(nos('stopped')).toContain('VEH-004')
    expect(nos('inAlert')).toContain('VEH-003')
    expect(nos('outOfZone')).toEqual(['VEH-001'])
  })

  it('gives the park availability against its target and the average age', async () => {
    const before = (await get('/fleet/dashboard')).data.data as FleetDashboardApi
    const { park } = before
    expect(park.total).toBe(park.available + park.onMission + park.immobilized)
    expect(park.availabilityTargetPct).toBe(90)
    expect(park.availabilityRate).toBeGreaterThan(0)
    expect(park.averageAgeYears).toBeGreaterThan(0)

    const saved = await call(server, 'put', '/fleet/settings/reporting', {
      as: 'FLT001',
      body: { availabilityTargetPct: 75 }
    })
    expect(saved.status).toBe(200)
    const after = (await get('/fleet/dashboard')).data.data as FleetDashboardApi
    expect(after.park.availabilityTargetPct).toBe(75)
  })

  it('keeps the target within bounds and with the fleet managers', async () => {
    const outOfRange = await call(server, 'put', '/fleet/settings/reporting', {
      as: 'FLT001',
      body: { availabilityTargetPct: 150 }
    })
    expect(outOfRange.status).toBe(422)
    const director = await call(server, 'put', '/fleet/settings/reporting', {
      as: 'DIR001',
      body: { availabilityTargetPct: 80 }
    })
    expect(director.status).toBe(403)
  })
})
