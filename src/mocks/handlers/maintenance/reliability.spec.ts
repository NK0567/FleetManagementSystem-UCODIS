import { beforeEach, describe, expect, it } from 'vitest'
import type {
  MaintenanceDashboardApi,
  ReliabilityApi,
  VehicleCostApi
} from '@/modules/maintenance/reliability/types/reliability.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const get = async <T>(path: string, query: Record<string, string> = {}, as = 'FLT001') => {
  const response = await call(server, 'get', path, { as, query, language: 'en' })
  return { status: response.status, data: response.data.data as T }
}

describe('reliability', () => {
  it('measure the period from the orders, the km read and the downtimes', async () => {
    const { data } = await get<ReliabilityApi>('/maintenance/reliability', {
      from: '2026-01-01',
      to: '2026-12-31'
    })
    expect(data.kpis.failures).toBeGreaterThan(0)
    expect(data.kpis.fleetKm).toBeGreaterThan(0)
    expect(data.kpis.mtbfKm).toBe(Math.round(data.kpis.fleetKm / data.kpis.failures))
    expect(data.kpis.availabilityRate).toBeGreaterThan(0)
    expect(data.kpis.availabilityRate).toBeLessThanOrEqual(100)
    expect(data.bySubsystem.reduce((total, item) => total + item.count, 0)).toBeLessThanOrEqual(
      data.kpis.failures
    )
    expect(data.lostDaysByFamily.every((item) => item.days > 0 && item.cost > 0)).toBe(true)
  })

  it('default to the last twelve months and let management read it', async () => {
    const { status, data } = await get<ReliabilityApi>('/maintenance/reliability', {}, 'DIR001')
    expect(status).toBe(200)
    expect(data.from < data.to).toBe(true)
  })
})

describe('maintenance dashboard', () => {
  it('count what calls for the workshop now', async () => {
    const { data } = await get<MaintenanceDashboardApi>('/maintenance/dashboard')
    expect(data).toMatchObject({
      awaitingValidation: 1,
      servicesToPlan: 2,
      blockingServices: 0,
      lowStockItems: 4,
      pendingPurchases: 1,
      tyreAlerts: 2
    })
    expect(data.unavailableVehicles).toBeGreaterThan(0)
  })
})

describe('vehicle running cost', () => {
  it('add the period costs by item and keep acquisition apart', async () => {
    const { data } = await get<VehicleCostApi>('/maintenance/vehicle-costs/VEH-001', {
      from: '2026-01-01',
      to: '2026-12-31'
    })
    expect(data.vehicleNo).toBe('VEH-001')
    expect(data.maintenance).toBeGreaterThan(0)
    expect(data.fuel).toBeGreaterThan(0)
    expect(data.tyres).toBeGreaterThan(0)
    expect(data.insurance).toBeGreaterThan(0)
    expect(data.total).toBe(data.maintenance + data.fuel + data.tyres + data.insurance)
    expect(data.costPerKm).toBe(data.km ? Math.round((data.total / data.km) * 100) / 100 : null)
  })
})
