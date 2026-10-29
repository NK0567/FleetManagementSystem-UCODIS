import { beforeEach, describe, expect, it } from 'vitest'
import type { AlertStatsApi } from '@/modules/fleet/alerts/types/alert.types'
import type { ClaimSummaryApi } from '@/modules/fleet/claims/types/claim.types'
import type { VehicleEmissionsApi } from '@/modules/fleet/fuel-consumption/types/fuelConsumption.types'
import type {
  LivePositionApi,
  OnboardReadingsApi
} from '@/modules/fleet/live-map/types/liveMap.types'
import type { FleetReportApi } from '@/modules/fleet/reports/types/fleetReport.types'
import type { RoadChecklistApi } from '@/modules/fleet/road-checklists/types/roadChecklist.types'
import type { TripApi, TripSummaryApi } from '@/modules/fleet/trips/types/trip.types'
import type { VehicleApi } from '@/modules/fleet/vehicles/types/vehicle.types'
import { addMinutes, nowIsoDateTime } from '@/utils/date'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const get = (path: string, query: Record<string, unknown> = {}, as = 'FLT001') =>
  call(server, 'get', path, { as, query, language: 'fr' })

async function positions(): Promise<LivePositionApi[]> {
  return (await get('/fleet/live/positions')).data.data as LivePositionApi[]
}

const listItems = <T>(response: { data: { data: unknown } }) =>
  (response.data.data as { items: T[] }).items

describe('on-board readings on the map', () => {
  it('shows the engine and the gauge, and an idling vehicle as such', async () => {
    const all = await positions()
    const warming = all.find((row) => row.vehicleNo === 'VEH-004')
    expect(warming).toMatchObject({ situation: 'idling', engineOn: true, fuelLevelPct: 47 })
    const driving = all.find((row) => row.vehicleNo === 'VEH-003')
    expect(driving?.situation).toBe('moving')
    expect(driving?.engineOn).toBe(true)
    expect(driving?.fuelLevelPct).toBeLessThanOrEqual(91)
    expect(driving?.fuelLevelPct).toBeGreaterThanOrEqual(6)
    expect(driving?.make).toBe('Sinotruk')
    // A vehicle off the road and in the workshop runs no engine.
    const immobilized = all.find((row) => row.situation === 'immobilized')
    expect(immobilized?.engineOn).toBe(false)
  })

  it('burns fuel while the simulation moves the vehicles', async () => {
    const before = (await positions()).find((row) => row.vehicleNo === 'VEH-003')
    await call(server, 'post', '/fleet/live/simulation', { as: 'FLT001', body: { active: true } })
    for (let step = 0; step < 6; step++) await positions()
    const after = (await positions()).find((row) => row.vehicleNo === 'VEH-003')
    expect(after?.fuelLevelPct ?? 0).toBeLessThanOrEqual(before?.fuelLevelPct ?? 0)
    await call(server, 'post', '/fleet/live/simulation', { as: 'FLT001', body: { reset: true } })
  })
})

describe('telemetry of a vehicle', () => {
  it('gives the last readings, newest first, with the open fault codes', async () => {
    const response = await get('/fleet/telematics-readings/VEH-006')
    const data = response.data.data as OnboardReadingsApi
    expect(data.tracked).toBe(true)
    expect(data.readings).toHaveLength(5)
    expect(data.readings[0]?.at).toBe(data.current?.at)
    expect(data.readings[0]!.at > data.readings[1]!.at).toBe(true)
    expect(data.faultCodes.map((fault) => fault.code)).toContain('P0087')
  })

  it('says a vehicle without a unit in service reports nothing', async () => {
    const data = (await get('/fleet/telematics-readings/VEH-009')).data.data as OnboardReadingsApi
    expect(data).toMatchObject({ tracked: false, current: null, readings: [] })
  })

  it('refuses a profile without the telematics and an unknown vehicle', async () => {
    expect((await get('/fleet/telematics-readings/VEH-006', {}, 'PLN001')).status).toBe(403)
    expect((await get('/fleet/telematics-readings/VEH-999')).status).toBe(404)
  })
})

describe('emissions by vehicle', () => {
  it('gives the CO2, the grams per km and the eco-driving events', async () => {
    const rows = (await get('/fleet/fuel-consumption/emissions')).data.data as VehicleEmissionsApi[]
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) expect(row.co2Kg).toBe(Math.round((row.liters * 2680) / 1000))
    const idler = rows.find((row) => row.vehicleNo === 'VEH-004')
    expect(idler?.ecoEvents.some((event) => event.eventTypeName.includes('ralenti'))).toBe(true)
    expect(rows.some((row) => row.co2GramsPerKm !== null)).toBe(true)
  })

  it('is refused without the consumption screen', async () => {
    expect((await get('/fleet/fuel-consumption/emissions', {}, 'PLN001')).status).toBe(403)
  })
})

describe('missed stops of the trips', () => {
  it('counts a stop left behind and filters the trips that missed one', async () => {
    const trip = server.db.trips.findOrFail('TRP-00006')
    const stamp = nowIsoDateTime()
    // The first stop and the third are passed, the second is left behind.
    server.db.trips.update(trip.no, {
      stops: trip.stops.map((stop, index) => ({
        ...stop,
        passedAt: index === 0 || index === 2 ? stamp : null
      }))
    })
    const summary = (await get('/fleet/trips/summary')).data.data as TripSummaryApi
    expect(summary.missedStops).toBeGreaterThanOrEqual(1)
    expect(summary.tripsWithMissedStops).toBeGreaterThanOrEqual(1)
    const filters = JSON.stringify([{ field: 'hasMissedStops', valueType: 'boolean', value: true }])
    const missed = listItems<TripApi>(await get('/fleet/trips', { filters, pageSize: 200 }))
    expect(missed.find((row) => row.no === 'TRP-00006')?.missedStopCount).toBe(1)
    expect(missed.every((row) => row.missedStopCount > 0)).toBe(true)
  })
})

describe('fleet reports', () => {
  const report = async (kind: string) =>
    (await get(`/fleet/reports/${kind}`, { from: '2026-01-01', to: '2026-12-31' })).data
      .data as FleetReportApi

  it('adds maintenance and immobilization to the summary, read against their target', async () => {
    const rows = (await report('summary')).sections[0]!.rows
    const keys = rows.map((row) => row.indicator)
    expect(keys).toEqual(
      expect.arrayContaining([
        'immobilizationDays',
        'maintenanceInterventions',
        'preventiveShare',
        'maintenanceCost'
      ])
    )
    expect(rows.find((row) => row.indicator === 'preventiveShare')?.target).toBe(60)
    expect(rows.find((row) => row.indicator === 'availabilityToday')?.target).toBe(90)
    expect(rows.find((row) => row.indicator === 'kmDriven')?.target).toBeNull()
  })

  it('opens the audit on the compliance summary and lists the departures', async () => {
    const audit = await report('audit')
    const compliance = audit.sections.find((section) => section.key === 'compliance')
    expect(compliance?.rows.map((row) => row.control)).toEqual([
      'vehicleDocuments',
      'driverDocuments',
      'inspections',
      'departures',
      'deviations'
    ])
    for (const row of compliance?.rows ?? []) {
      expect(Number(row.compliant)).toBeLessThanOrEqual(Number(row.total))
    }
    expect(audit.sections.some((section) => section.key === 'departures')).toBe(true)
  })

  it('counts the driving-time breaches of each driver', async () => {
    const drivers = await report('drivers')
    const byDriver = drivers.sections.find((section) => section.key === 'byDriver')
    expect(byDriver?.columns.map((column) => column.key)).toContain('drivingTimeBreaches')
  })
})

describe('claims and alerts figures', () => {
  it('gives the accidents per million km and what the claims cost', async () => {
    const summary = (await get('/fleet/claims/summary')).data.data as ClaimSummaryApi
    expect(summary.fleetKm).toBeGreaterThan(0)
    expect(summary.accidentsPerMillionKm).toBe(
      Math.round((summary.accidents / summary.fleetKm) * 1_000_000 * 100) / 100
    )
    expect(summary.residualTotal).toBeLessThanOrEqual(summary.damageTotal)
    expect((await get('/fleet/claims/summary', {}, 'PLN001')).status).toBe(403)
  })

  it('measures the average handling time once an alert is handled', async () => {
    const before = (await get('/fleet/alerts/stats')).data.data as AlertStatsApi
    const open = listItems<{ no: string; status: string }>(
      await get('/fleet/alerts', { pageSize: 200 })
    ).find((alert) => alert.status === 'new')
    expect(open).toBeDefined()
    const handled = await call(
      server,
      'post',
      `/fleet/alerts/${encodeURIComponent(open!.no)}/handle`,
      {
        as: 'FLT001',
        body: { comment: 'Traité pendant le test.' }
      }
    )
    expect(handled.status).toBe(200)
    const after = (await get('/fleet/alerts/stats')).data.data as AlertStatsApi
    expect(after.handled).toBe(before.handled + 1)
    expect(after.averageHandlingHours).not.toBeNull()
  })
})

describe('vehicle list filters', () => {
  it('filters on the assignment, the coupling and the current site', async () => {
    const all = listItems<VehicleApi>(await get('/fleet/vehicles', { pageSize: 200 }))
    expect(all.find((row) => row.no === 'VEH-001')?.currentSiteNo).toBe('DEP-TNJ')
    const trailer = all.find((row) => !row.motorized)
    expect(trailer?.driverAssignment).toBeNull()
    const filters = (field: string, value: string) =>
      JSON.stringify([{ field, valueType: 'string', value: [value] }])
    const without = listItems<VehicleApi>(
      await get('/fleet/vehicles', { filters: filters('driverAssignment', 'without_driver') })
    )
    expect(without.every((row) => row.motorized && !row.driverNo)).toBe(true)
    const coupled = listItems<VehicleApi>(
      await get('/fleet/vehicles', { filters: filters('couplingState', 'coupled') })
    )
    expect(coupled.every((row) => !!row.coupledVehicleNo)).toBe(true)
    const atDepot = listItems<VehicleApi>(
      await get('/fleet/vehicles', { filters: filters('currentSiteNo', 'DEP-TNJ') })
    )
    expect(atDepot.length).toBeGreaterThan(0)
    expect(atDepot.every((row) => row.currentSiteNo === 'DEP-TNJ')).toBe(true)
  })
})

describe('signature and synchronization of the road checklists', () => {
  async function tourResults() {
    const tour = (await call(server, 'get', '/me/tour', { as: 'CND001' })).data.data as {
      checkPoints: { no: string }[]
    }
    return tour.checkPoints.map((point) => ({ pointNo: point.no, result: 'ok', comment: '' }))
  }

  it('records the signature of the driver and a checklist kept offline', async () => {
    const takenAt = addMinutes(nowIsoDateTime(), -30).slice(0, 16)
    const saved = await call(server, 'post', '/me/checklist', {
      as: 'CND001',
      body: {
        stage: 'stop',
        takenAt,
        results: await tourResults(),
        signed: true,
        signedAt: addMinutes(nowIsoDateTime(), -29),
        savedAt: new Date().toISOString()
      }
    })
    expect(saved.status).toBe(201)
    const no = (saved.data.data as { no: string }).no
    const row = (await get(`/fleet/road-checklists/${no}`)).data.data as RoadChecklistApi
    expect(row).toMatchObject({
      signed: true,
      capturedOffline: true,
      driverName: expect.any(String)
    })
    expect(row.syncedAt >= row.signedAt!).toBe(true)
  })

  it('keeps an unsigned checklist unsigned and refuses a signature before the checklist', async () => {
    const takenAt = addMinutes(nowIsoDateTime(), -10).slice(0, 16)
    const unsigned = await call(server, 'post', '/me/checklist', {
      as: 'CND001',
      body: { stage: 'stop', takenAt, results: await tourResults() }
    })
    expect(unsigned.status).toBe(201)
    expect(unsigned.data.data).toMatchObject({ signedAt: null, capturedOffline: false })

    const early = await call(server, 'post', '/me/checklist', {
      as: 'CND001',
      body: {
        stage: 'stop',
        takenAt,
        results: await tourResults(),
        signed: true,
        signedAt: addMinutes(nowIsoDateTime(), -60)
      }
    })
    expect(early.status).toBe(422)
  })

  it('shows the demo readings signed and synchronized', async () => {
    const rows = listItems<RoadChecklistApi>(await get('/fleet/road-checklists', { pageSize: 200 }))
    expect(rows.find((row) => row.no === 'CKL-00002')).toMatchObject({ capturedOffline: true })
    expect(rows.find((row) => row.no === 'CKL-00003')?.signed).toBe(false)
  })
})

describe('provider import', () => {
  const rows = [
    { name: 'Garage Test Import', providerType: 'garage', phone: '034 00 000 00' },
    { name: 'Garage Test Import', providerType: 'Garage' },
    { name: 'Sans type', providerType: 'inconnu' }
  ]

  it('creates the new providers and refuses the duplicates and unknown types', async () => {
    const response = await call(server, 'post', '/fleet/providers/import', {
      as: 'FLT001',
      body: { rows }
    })
    expect(response.status).toBe(200)
    expect(response.data.data).toMatchObject({ created: 1, rejected: 2 })
    const created = server.db.providers.all().find((row) => row.name === 'Garage Test Import')
    expect(created?.providerType).toBe('garage')
  })

  it('refuses a profile that cannot create providers, and an empty file', async () => {
    const planner = await call(server, 'post', '/fleet/providers/import', {
      as: 'PLN001',
      body: { rows }
    })
    expect(planner.status).toBe(403)
    const empty = await call(server, 'post', '/fleet/providers/import', {
      as: 'FLT001',
      body: { rows: [] }
    })
    expect(empty.status).toBe(422)
  })
})
