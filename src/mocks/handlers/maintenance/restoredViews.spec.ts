import { beforeEach, describe, expect, it } from 'vitest'
import type {
  MaintenancePlanApi,
  PlanCoverageApi
} from '@/modules/maintenance/maintenance-plans/types/maintenancePlan.types'
import type { ReliabilityApi } from '@/modules/maintenance/reliability/types/reliability.types'
import type {
  StockSummaryApi,
  SupplierSupplyApi
} from '@/modules/maintenance/stock-items/types/stockItem.types'
import type { TyrePositionSlot } from '@/modules/maintenance/tyres/types/tyre.types'
import type { WorkOrderApi } from '@/modules/maintenance/work-orders/types/workOrder.types'
import type { WorkshopLoadApi } from '@/modules/maintenance/workshop-load/types/workshopLoad.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const get = async <T>(path: string, as = 'FLT001', query: Record<string, unknown> = {}) =>
  (await call(server, 'get', path, { as, query })).data.data as T
const post = (path: string, body: Record<string, unknown> = {}, as = 'FLT001') =>
  call(server, 'post', path, { as, body })

describe('workshop load by competence', () => {
  it('counts the diagnosed inside jobs and their estimated hours by competence', async () => {
    const load = await get<WorkshopLoadApi>('/maintenance/workshop-load', 'MNT001')
    expect(load.competences).toContainEqual(
      expect.objectContaining({ competenceNo: 'MECHANICAL', jobCount: 1, estimatedHours: 3 })
    )
    // The order at the outside garage is not inside work.
    expect(load.competences.reduce((total, row) => total + row.jobCount, 0)).toBe(1)
  })
})

describe('orders at an outside garage', () => {
  it('flags, filters and searches the orders a garage holds', async () => {
    const page = await get<{ items: WorkOrderApi[] }>('/maintenance/work-orders', 'FLT001', {
      filters: JSON.stringify([{ field: 'atExternalWorkshop', valueType: 'boolean', value: true }])
    })
    expect(page.items.map((order) => order.no)).toEqual(['OT-2026-0006'])
    const found = await get<{ items: WorkOrderApi[] }>('/maintenance/work-orders', 'FLT001', {
      searchQuery: 'Ankorondrano',
      searchColumns: 'no,vehiclePlate,symptom,providerName'
    })
    expect(found.items.map((order) => order.no)).toEqual(['OT-2026-0006'])
    // Back from the garage, it no longer counts as held there.
    const closed = await get<WorkOrderApi>('/maintenance/work-orders/OT-2026-0005')
    expect(closed.atExternalWorkshop).toBe(false)
  })
})

describe('hourly rate by competence', () => {
  it('costs the labour at the rate of the competence, else at the single rate', async () => {
    expect((await get<WorkOrderApi>('/maintenance/work-orders/OT-2026-0004')).labourCost).toBe(
      60_000
    )
    expect((await get<WorkOrderApi>('/maintenance/work-orders/OT-2026-0001')).labourCost).toBe(
      60_000
    )
    const patched = await call(server, 'patch', '/maintenance/competences/MECHANICAL', {
      as: 'FLT001',
      body: { hourlyRate: 20_000 }
    })
    expect(patched.status).toBe(200)
    expect((await get<WorkOrderApi>('/maintenance/work-orders/OT-2026-0001')).labourCost).toBe(
      120_000
    )
    const negative = await call(server, 'patch', '/maintenance/competences/MECHANICAL', {
      as: 'FLT001',
      body: { hourlyRate: -5 }
    })
    expect(negative.status).toBe(400)
  })
})

describe('back to the proposed downtime causes', () => {
  it('restores the defaults, keeps a used custom cause and drops an unused one', async () => {
    await call(server, 'patch', '/maintenance/downtime-codes/ATP', {
      as: 'FLT001',
      body: { name: 'Pièce attendue' }
    })
    await call(server, 'delete', '/maintenance/downtime-codes/ABS', { as: 'FLT001' })
    for (const no of ['GRV', 'MTO']) {
      await post('/maintenance/downtime-codes', { no, name: `Cause ${no}`, family: 'human' })
    }
    server.db.downtimes.update('IND-00002', { downtimeCodeNo: 'GRV' })

    expect((await post('/maintenance/downtime-codes/reset', {}, 'MNT001')).status).toBe(403)
    const reset = await post('/maintenance/downtime-codes/reset')
    expect(reset.status).toBe(200)
    const codes = (reset.data.data as { no: string; name: string }[]).map((code) => code.no)
    expect(codes).toContain('ABS')
    expect(codes).toContain('GRV')
    expect(codes).not.toContain('MTO')
    expect(server.db.downtimeCodes.find('ATP')?.name).toBe('Attente de pièce')
  })
})

describe('stock value, movements and suppliers', () => {
  it('sums the stock value, lists every movement and tells what a supplier provides', async () => {
    const summary = await get<StockSummaryApi>('/maintenance/stock-items/summary', 'MNT001')
    const items = await get<{ items: { stockValue: number }[] }>(
      '/maintenance/stock-items',
      'MNT001',
      { pageSize: 500 }
    )
    expect(summary.totalValue).toBe(items.items.reduce((total, row) => total + row.stockValue, 0))
    expect(summary.itemCount).toBe(items.items.length)

    const movements = await get<{ items: { itemNo: string }[] }>(
      '/maintenance/stock-movements',
      'MNT001'
    )
    expect(new Set(movements.items.map((row) => row.itemNo)).size).toBeGreaterThan(1)

    const supply = await get<SupplierSupplyApi>('/maintenance/suppliers/PRS-006/supply', 'MNT001')
    expect(supply.items.length).toBeGreaterThan(0)
    expect(
      (await call(server, 'get', '/maintenance/suppliers/PRS-006/supply', { as: 'PLN001' })).status
    ).toBe(403)
    expect(
      (await call(server, 'get', '/maintenance/suppliers/NONE/supply', { as: 'MNT001' })).status
    ).toBe(404)
  })
})

describe('maintenance plan coverage', () => {
  it('lists the models without a plan and creates one in a click, once', async () => {
    const coverage = await get<PlanCoverageApi>('/maintenance/maintenance-plans/coverage')
    const model = coverage.modelsWithoutPlan[0]
    expect(model).toBeDefined()
    expect(
      (
        await post(
          '/maintenance/maintenance-plans/for-model',
          { modelCode: model!.modelCode },
          'MNT001'
        )
      ).status
    ).toBe(403)
    const createdPlan = await post('/maintenance/maintenance-plans/for-model', {
      modelCode: model!.modelCode
    })
    expect(createdPlan.status).toBe(201)
    expect(createdPlan.data.data).toMatchObject({ provisional: true, active: true })
    expect(
      (await post('/maintenance/maintenance-plans/for-model', { modelCode: model!.modelCode }))
        .status
    ).toBe(409)
    expect(
      (await post('/maintenance/maintenance-plans/for-model', { modelCode: 'Nobody|Nothing' }))
        .status
    ).toBe(400)
    const after = await get<PlanCoverageApi>('/maintenance/maintenance-plans/coverage')
    expect(after.modelsWithoutPlan.map((row) => row.modelCode)).not.toContain(model!.modelCode)
  })

  it('offers to reactivate an inactive plan its vehicles still depend on', async () => {
    const plan = (await get<{ items: MaintenancePlanApi[] }>('/maintenance/maintenance-plans'))
      .items[0]!
    await call(server, 'patch', `/maintenance/maintenance-plans/${plan.no}`, {
      as: 'FLT001',
      body: { active: false }
    })
    const coverage = await get<PlanCoverageApi>('/maintenance/maintenance-plans/coverage')
    expect(coverage.inactivePlansInUse).toContainEqual(
      expect.objectContaining({ no: plan.no, vehicleCount: plan.vehicleCount })
    )
  })
})

describe('reliability details', () => {
  it('gives the MTBF by subsystem, road against workshop and days lost per 10 000 km', async () => {
    const reliability = await get<ReliabilityApi>('/maintenance/reliability', 'MNT001')
    expect(reliability.mtbfBySubsystem.length).toBeGreaterThan(0)
    expect(reliability.breakdownPlace.road).toBeGreaterThanOrEqual(1)
    const { road, workshop, roadShare } = reliability.breakdownPlace
    expect(roadShare).toBe(Math.round((road * 100) / (road + workshop)))
    for (const row of reliability.lostDaysPer10000Km) {
      expect(row.ratio).toBe(Math.round(((row.lostDays * 10_000) / row.km) * 100) / 100)
    }
  })
})

describe('tyre plan of a vehicle', () => {
  it('gives each position its tyre and alert', async () => {
    const slots = await get<TyrePositionSlot[]>('/maintenance/tyres/positions', 'MNT001', {
      vehicleNo: 'VEH-001'
    })
    expect(slots.length).toBeGreaterThan(0)
    for (const slot of slots) {
      if (slot.tyreNo) expect(['none', 'safety', 'rotation']).toContain(slot.alert)
      else expect(slot.alert).toBeNull()
    }
  })
})

describe('service due counters', () => {
  it('counts the overdue and close items as the list does', async () => {
    const summary = await get<{ overdue: number; dueSoon: number }>(
      '/maintenance/service-due/summary',
      'MNT001'
    )
    const rows = await get<{ items: { status: string }[] }>('/maintenance/service-due', 'MNT001', {
      pageSize: 500
    })
    expect(summary.overdue).toBe(
      rows.items.filter((row) => row.status === 'overdue' || row.status === 'blocking').length
    )
    expect(summary.dueSoon).toBe(rows.items.filter((row) => row.status === 'due_soon').length)
    expect(
      (await call(server, 'get', '/maintenance/service-due/summary', { as: 'PLN001' })).status
    ).toBe(403)
  })
})
