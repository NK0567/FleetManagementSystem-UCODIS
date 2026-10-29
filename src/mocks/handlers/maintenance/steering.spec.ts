import { beforeEach, describe, expect, it } from 'vitest'
import type {
  MaintenanceDashboardApi,
  ReliabilityApi
} from '@/modules/maintenance/reliability/types/reliability.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const get = async <T>(path: string, query: Record<string, string> = {}, as = 'FLT001') => {
  const response = await call(server, 'get', path, { as, query, language: 'fr' })
  return { status: response.status, data: response.data.data as T }
}

const YEAR = { from: '2026-01-01', to: '2026-12-31' }

describe('maintenance steering', () => {
  it('counts the orders in progress, planned and late from their planning day', async () => {
    const before = (await get<ReliabilityApi>('/maintenance/reliability', YEAR)).data.workload
    const order = server.db.workOrders
      .all()
      .find((row) => !row.startedAt && !row.completedAt && !row.cancelledAt && row.planning)
    expect(order).toBeDefined()
    server.db.workOrders.update(order!.no, {
      planning: { ...order!.planning!, date: '2026-09-01' }
    })
    const after = (await get<ReliabilityApi>('/maintenance/reliability', YEAR)).data.workload
    expect(after.late).toBe(before.late + 1)
    expect(after.planned).toBe(before.planned - 1)
    expect(after.inProgress).toBe(before.inProgress)
  })

  it('measures the preventive done, the cost by kind and the days lost by cause', async () => {
    const { data } = await get<ReliabilityApi>('/maintenance/reliability', YEAR)
    const { preventiveCompletion: completion, costByType, lostDaysByCause } = data
    expect(completion.done).toBeLessThanOrEqual(completion.due)
    expect(completion.rate).toBe(
      completion.due ? Math.round((completion.done * 100) / completion.due) : null
    )
    expect(costByType.preventive + costByType.corrective + costByType.improvement).toBe(
      data.kpis.totalCost
    )
    expect(lostDaysByCause.ratio).toBe(
      lostDaysByCause.technical
        ? Math.round((lostDaysByCause.human / lostDaysByCause.technical) * 100) / 100
        : null
    )
    expect(data.byMode).toBeDefined()
    expect(data.byCause).toBeDefined()
  })

  it('reads the targets from the settings, set by the workshop managers only', async () => {
    const { data } = await get<MaintenanceDashboardApi>('/maintenance/dashboard')
    expect(data.targets.preventiveShareTargetPct).toBe(60)
    const saved = await call(server, 'put', '/maintenance/settings/targets', {
      as: 'FLT001',
      body: {
        preventiveShareTargetPct: 70,
        preventiveCompletionTargetPct: 95,
        mttrTargetHours: 12,
        mtbfTargetKm: 25000
      }
    })
    expect(saved.status).toBe(200)
    const after = (await get<MaintenanceDashboardApi>('/maintenance/dashboard')).data
    expect(after.targets).toEqual({
      preventiveShareTargetPct: 70,
      preventiveCompletionTargetPct: 95,
      mttrTargetHours: 12,
      mtbfTargetKm: 25000
    })
    const technician = await call(server, 'put', '/maintenance/settings/targets', {
      as: 'MNT001',
      body: { preventiveShareTargetPct: 10 }
    })
    expect(technician.status).toBe(403)
    const outOfRange = await call(server, 'put', '/maintenance/settings/targets', {
      as: 'FLT001',
      body: { ...after.targets, preventiveShareTargetPct: 140 }
    })
    expect(outOfRange.status).toBe(422)
  })

  it('shows the indicators to the maintenance technician and not to a planner', async () => {
    expect((await get('/maintenance/dashboard', {}, 'MNT001')).status).toBe(200)
    expect((await get('/maintenance/reliability', YEAR, 'MNT001')).status).toBe(200)
    expect((await get('/maintenance/reliability', YEAR, 'PLN001')).status).toBe(403)
  })
})
