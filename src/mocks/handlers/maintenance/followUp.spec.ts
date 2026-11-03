import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AlertApi } from '@/modules/fleet/alerts/types/alert.types'
import type { FuelRefillApi } from '@/modules/fleet/fuel-refills/types/fuelRefill.types'
import type { RouteDeviationApi } from '@/modules/fleet/route-deviations/types/routeDeviation.types'
import type { VehicleMaintenanceEntry } from '@/modules/fleet/vehicles/types/vehicleRecords.types'
import type { MobileInterventionApi } from '@/modules/maintenance/mobile-interventions/types/mobileIntervention.types'
import type { WorkOrderApi } from '@/modules/maintenance/work-orders/types/workOrder.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const post = (path: string, body: Record<string, unknown>, as = 'FLT001') =>
  call(server, 'post', path, { as, body, language: 'en' })

const refillBody = (extra: Record<string, unknown> = {}) => ({
  vehicleNo: 'VEH-003',
  refueledAt: '2026-09-04T09:50',
  liters: 200,
  unitPrice: 5475,
  odometerKm: 201_390,
  fullTank: false,
  ...extra
})

describe('service due alert', () => {
  it('reaches the maintenance manager, who is the one the story names', async () => {
    const response = await call(server, 'get', '/fleet/alerts', {
      as: 'RMT001',
      query: { pageSize: 200 },
      language: 'fr'
    })
    const items = (response.data.data as { items: AlertApi[] }).items
    expect(items.filter((alert) => alert.category === 'service').length).toBeGreaterThan(0)
  })

  it('stays away from a profile that is not a recipient of the rule', async () => {
    const response = await call(server, 'get', '/fleet/alerts', {
      as: 'PLN001',
      query: { pageSize: 200 }
    })
    expect(response.status).toBe(403)
  })
})

describe('mobile team intervention', () => {
  const body = (vehicleNo: string) => ({
    missionTypeNo: 'MECHANICAL',
    vehicleNo,
    location: 'RN2, avant Moramanga',
    crewNos: ['UCT-003']
  })

  it('carries the GPS position of a vehicle that has a unit', async () => {
    const response = await post('/maintenance/mobile-interventions', body('VEH-003'), 'RMT001')
    expect(response.status).toBe(201)
    const created = response.data.data as MobileInterventionApi
    expect(created.vehiclePosition).toMatchObject({ reportedAt: expect.any(String) })
    expect(typeof created.vehiclePosition?.latitude).toBe('number')
  })

  it('carries no position for a vehicle without a unit in service', async () => {
    const response = await post('/maintenance/mobile-interventions', body('VEH-013'), 'RMT001')
    expect(response.status).toBe(201)
    expect((response.data.data as MobileInterventionApi).vehiclePosition).toBeNull()
  })
})

describe('maintenance log of a vehicle', () => {
  it('splits what an order cost into parts and labour, by subsystem', async () => {
    const response = await call(server, 'get', '/fleet/vehicles/VEH-001/maintenance-log', {
      as: 'FLT001'
    })
    const orders = (response.data.data as VehicleMaintenanceEntry[]).filter(
      (entry) => entry.kind === 'work_order'
    )
    expect(orders[0]).toMatchObject({ no: 'OT-2026-0001' })
    expect(orders[0]?.subsystemName).not.toBe('')
    expect(
      (orders[0]?.partsCost ?? 0) +
        (orders[0]?.labourCost ?? 0) +
        (orders[0]?.externalCost ?? 0) +
        (orders[0]?.importedCost ?? 0)
    ).toBe(orders[0]?.cost)
  })
})

describe('parts wait', () => {
  it('counts to the minute, so that a few hours do not round to zero days', async () => {
    const requested = await post(
      '/maintenance/purchase-requests',
      { workOrderNo: 'OT-2026-0003', itemNo: 'FLT-AIR-HW', quantity: 1 },
      'MNT001'
    )
    const no = (requested.data.data as { no: string }).no
    await post(
      `/maintenance/purchase-requests/${no}/order`,
      { orderNumber: 'BC-2026-0200', supplierNo: 'PRS-013' },
      'RMT001'
    )
    vi.setSystemTime(new Date(Date.now() + 3 * 3_600_000))
    const order = await call(server, 'get', '/maintenance/work-orders/OT-2026-0003', {
      as: 'RMT001'
    })
    const wait = (order.data.data as WorkOrderApi).partsWaitDays
    expect(wait).toBeGreaterThan(0.1)
    expect(wait).toBeLessThan(0.15)
  })
})

describe('fuel refill', () => {
  it('names the trip of its vehicle, or the one the vehicle was on', async () => {
    const named = await post('/fleet/fuel-refills', refillBody({ tripNo: 'TRP-00006' }))
    expect(named.status).toBe(201)
    expect((named.data.data as FuelRefillApi).tripNo).toBe('TRP-00006')
    const deduced = await post(
      '/fleet/fuel-refills',
      refillBody({ refueledAt: '2026-09-04T09:20', liters: 150, odometerKm: 201_385 })
    )
    expect((deduced.data.data as FuelRefillApi).tripNo).toBe('TRP-00006')
  })

  it('refuses the trip of another vehicle, and an unknown trip', async () => {
    expect((await post('/fleet/fuel-refills', refillBody({ tripNo: 'TRP-00001' }))).status).toBe(
      422
    )
    expect((await post('/fleet/fuel-refills', refillBody({ tripNo: 'TRP-99999' }))).status).toBe(
      400
    )
  })

  it('takes the position from the unit of the vehicle and flags a station far from it', async () => {
    const response = await post('/fleet/fuel-refills', refillBody({ stationSiteNo: 'STA-AMB' }))
    expect(response.status).toBe(201)
    const refill = response.data.data as FuelRefillApi
    expect(refill.latitude).not.toBeNull()
    expect(refill.status).toBe('anomaly')
    expect(refill.checks.find((check) => check.code === 'gps')?.ok).toBe(false)
  })

  it('says a position was read when no station site is named', async () => {
    const response = await post('/fleet/fuel-refills', refillBody({ stationName: 'Station X' }))
    const refill = response.data.data as FuelRefillApi
    expect(refill.checks.find((check) => check.code === 'gps')?.detail).toContain('Position read')
  })
})

describe('automatic matching of card transactions', () => {
  it('says what is left when nothing more can be matched', async () => {
    await post('/fleet/fuel-card-transactions/match-all', {})
    const again = await post('/fleet/fuel-card-transactions/match-all', {})
    expect(again.data.data).toMatchObject({ matched: 0 })
    expect(typeof (again.data.data as { remaining: number }).remaining).toBe('number')
  })
})

describe('simulated movement', () => {
  it('lets the control room find a missed checkpoint and a rest outside a parking', async () => {
    await post('/fleet/live/simulation', { active: true })
    for (let step = 0; step < 40; step++) {
      await call(server, 'get', '/fleet/live/positions', { as: 'FLT001' })
    }
    await post('/fleet/live/simulation', { reset: true })
    const response = await call(server, 'get', '/fleet/route-deviations', {
      as: 'FLT001',
      query: { pageSize: 200 }
    })
    const found = (response.data.data as { items: RouteDeviationApi[] }).items
    const types = found.map((deviation) => deviation.deviationTypeNo)
    expect(types).toContain('MISSED-STOP')
    expect(types).toContain('REST-PLACE')
    // Whatever the system finds starts « to qualify ».
    for (const deviation of found.filter((row) => row.createdBy === 'SYSTEM')) {
      if (['MISSED-STOP', 'REST-PLACE'].includes(deviation.deviationTypeNo)) {
        expect(deviation.nature).toBe('to_qualify')
      }
    }
  })

  it('plays nothing while the simulation is off', async () => {
    for (let step = 0; step < 5; step++) {
      await call(server, 'get', '/fleet/live/positions', { as: 'FLT001' })
    }
    const response = await call(server, 'get', '/fleet/route-deviations', {
      as: 'FLT001',
      query: { pageSize: 200 }
    })
    const types = (response.data.data as { items: RouteDeviationApi[] }).items.map(
      (deviation) => deviation.deviationTypeNo
    )
    expect(types).not.toContain('REST-PLACE')
  })
})

describe('route deviation handling', () => {
  it('records a justification, then a qualification that presumes no intent', async () => {
    const justified = await post('/fleet/route-deviations/ECA-00004/justify', {
      justification: 'Crevaison, roue changée au bord de la route.'
    })
    expect(justified.status).toBe(200)
    const qualified = await post('/fleet/route-deviations/ECA-00004/qualify', {
      nature: 'endured',
      decision: 'dismissed',
      reason: 'Justification reçue du conducteur, photo de la roue jointe.'
    })
    expect(qualified.status).toBe(200)
    const after = qualified.data.data as RouteDeviationApi
    expect(after.nature).toBe('endured')
  })

  it('refuses a qualification without nature or reason, and a second one', async () => {
    expect((await post('/fleet/route-deviations/ECA-00004/qualify', { reason: 'x' })).status).toBe(
      400
    )
    expect(
      (await post('/fleet/route-deviations/ECA-00004/qualify', { nature: 'authorized' })).status
    ).toBe(422)
    await post('/fleet/route-deviations/ECA-00004/qualify', {
      nature: 'authorized',
      decision: 'dismissed',
      reason: 'Arrêt convenu avec le client.'
    })
    expect(
      (
        await post('/fleet/route-deviations/ECA-00004/qualify', {
          nature: 'authorized',
          decision: 'dismissed',
          reason: 'Encore.'
        })
      ).status
    ).toBe(409)
  })
})

describe('qualification of a refill', () => {
  it('turns a refill to qualify into a qualified one, with a cause and a comment', async () => {
    const created = await post('/fleet/fuel-refills', refillBody({ stationSiteNo: 'STA-AMB' }))
    const no = (created.data.data as FuelRefillApi).no
    expect((await post(`/fleet/fuel-refills/${no}/qualify`, { comment: 'x' })).status).toBe(400)
    const done = await post(`/fleet/fuel-refills/${no}/qualify`, {
      causeNo: 'ENTRY-ERROR',
      comment: 'Station saisie par erreur, le plein a eu lieu au dépôt.'
    })
    expect(done.status).toBe(200)
    expect((done.data.data as FuelRefillApi).status).toBe('qualified')
  })
})
