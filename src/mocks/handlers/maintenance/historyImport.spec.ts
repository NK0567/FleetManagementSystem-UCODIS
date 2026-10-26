import { beforeEach, describe, expect, it } from 'vitest'
import type { ImportReport } from '@/core/utils/csvImport'
import type { ReliabilityApi } from '@/modules/maintenance/reliability/types/reliability.types'
import type { WorkOrderApi } from '@/modules/maintenance/work-orders/types/workOrder.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const importRows = (rows: unknown, as = 'FLT001') =>
  call(server, 'post', '/maintenance/work-orders/import', { as, body: { rows }, language: 'en' })

const row = {
  plate: '4021 TBA',
  doneOn: '2026-03-12',
  maintenanceType: 'preventive',
  workDone: 'Vidange et remplacement des filtres.',
  odometerKm: 120_500,
  cost: 450_000
}

describe('maintenance history import', () => {
  it('create closed orders line by line and report the refused ones', async () => {
    const report = (
      await importRows([
        row,
        { ...row, plate: '9999 XXX' },
        { ...row, doneOn: '2099-01-01' },
        { ...row, maintenanceType: 'improvement' },
        { ...row, cost: -5 }
      ])
    ).data.data as ImportReport
    expect(report).toMatchObject({ created: 1, rejected: 4 })
    expect(report.results[1]?.error).toBe('No vehicle has the plate "9999 XXX".')

    const order = (
      await call(server, 'get', `/maintenance/work-orders/${report.results[0]?.no}`, {
        as: 'FLT001'
      })
    ).data.data as WorkOrderApi
    expect(order).toMatchObject({
      origin: 'history',
      status: 'closed',
      maintenanceType: 'preventive',
      totalCost: 450_000,
      downtimeNo: null,
      odometerKmAtCompletion: 120_500
    })
  })

  it('count imported cost in the period, not in reliability', async () => {
    const period = { from: '2026-03-01', to: '2026-03-31' }
    const before = (
      await call(server, 'get', '/maintenance/reliability', { as: 'FLT001', query: period })
    ).data.data as ReliabilityApi
    await importRows([{ ...row, maintenanceType: 'corrective' }])
    const after = (
      await call(server, 'get', '/maintenance/reliability', { as: 'FLT001', query: period })
    ).data.data as ReliabilityApi
    expect(after.kpis.totalCost).toBe(before.kpis.totalCost + 450_000)
    expect(after.kpis.failures).toBe(before.kpis.failures)
  })

  it('refuse an empty file and a user without the right', async () => {
    expect((await importRows([])).status).toBe(422)
    expect((await importRows([row], 'MNT001')).status).toBe(403)
  })
})
