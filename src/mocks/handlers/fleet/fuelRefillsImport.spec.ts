import { beforeEach, describe, expect, it } from 'vitest'
import type {
  FuelRefillApi,
  RefillImportReport
} from '@/modules/fleet/fuel-refills/types/fuelRefill.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const importRows = (rows: unknown) =>
  call(server, 'post', '/fleet/fuel-refills/import', {
    as: 'FLT001',
    body: { rows },
    language: 'en'
  })

const line = {
  plate: '4023tba',
  refueledAt: '2026-09-03T15:00',
  liters: 300,
  unitPrice: 5500,
  odometerKm: 201_000,
  stationName: 'Station Jovena Ivato',
  fullTank: true
}

describe('refill import', () => {
  it('creates the valid lines with the rules of a typed refill, and reports the others', async () => {
    const response = await importRows([
      line,
      { ...line, plate: 'XX 000' },
      { ...line, refueledAt: '2026-09-05T08:00' },
      { ...line, refueledAt: '2026-09-03T15:05' },
      { ...line, liters: undefined, refueledAt: '2026-09-02T09:00' }
    ])
    const report = response.data.data as RefillImportReport
    expect(report).toMatchObject({ created: 1, rejected: 4 })
    expect(report.results.map((result) => result.line)).toEqual([1, 2, 3, 4, 5])
    expect(report.results[1]?.error).toContain('XX 000')
    expect(report.results[3]?.error).toContain(report.results[0]?.no ?? '?')

    const created = (
      await call(server, 'get', `/fleet/fuel-refills/${report.results[0]?.no}`, { as: 'FLT001' })
    ).data.data as FuelRefillApi
    expect(created).toMatchObject({ vehicleNo: 'VEH-003', channel: 'import', driverNo: 'UCT-012' })
  })

  it('refuses an empty file and a file too large to check', async () => {
    expect((await importRows([])).status).toBe(422)
    expect((await importRows(Array.from({ length: 1001 }, () => line))).status).toBe(422)
  })
})
