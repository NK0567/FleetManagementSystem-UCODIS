import { beforeEach, describe, expect, it } from 'vitest'
import type { ImportReport } from '@/core/utils/csvImport'
import type {
  FuelConsumptionApi,
  FuelConsumptionSummary
} from '@/modules/fleet/fuel-consumption/types/fuelConsumption.types'
import type { FuelCardTransactionApi } from '@/modules/fleet/fuel-card-transactions/types/fuelCardTransaction.types'
import type { FuelRefillApi } from '@/modules/fleet/fuel-refills/types/fuelRefill.types'
import type { FileMeta } from '@/types/file.types'
import { DEMO_REFERENCE_DATE } from '../../clock'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const post = (path: string, body: unknown = {}, as = 'FLT001') =>
  call(server, 'post', path, { as, body: body as Record<string, unknown>, language: 'en' })

async function list<T>(path: string) {
  return (
    (await call(server, 'get', path, { as: 'FLT001', query: { pageSize: 200 }, language: 'en' }))
      .data.data as { items: T[] }
  ).items
}

async function receipt(as: string) {
  const form = new FormData()
  form.append('file', new File(['jpeg'], 'recu.jpg', { type: 'image/jpeg' }))
  return (await call(server, 'post', '/files', { as, body: form })).data.data as FileMeta
}

describe('refills from the driver phone', () => {
  it('need the receipt and land on the driver and his own vehicle', async () => {
    const refill = {
      liters: 120,
      unitPrice: 5500,
      odometerKm: 166_100,
      stationName: 'Station Jovena Ambohimanambola',
      fullTank: false,
      vehicleNo: 'VEH-001'
    }
    expect((await post('/me/refills', refill, 'CND002')).status).toBe(422)
    expect((await post('/me/refills', refill, 'FLT001')).status).toBe(403)
    const file = await receipt('CND002')
    const created = await post('/me/refills', { ...refill, receiptFileNo: file.no }, 'CND002')
    expect(created.status).toBe(201)
    expect(created.data.data).toMatchObject({
      vehicleNo: 'VEH-002',
      driverNo: 'UCT-011',
      channel: 'mobile',
      receiptFileNo: file.no
    })
    const mine = await call(server, 'get', '/me/refills', { as: 'CND002' })
    expect(mine.data.data).toMatchObject({ vehiclePlate: '4022 TBA' })
  })
})

describe('card statements', () => {
  it('import the supplier lines, refuse the unknown cards and match the refills', async () => {
    const at = `${DEMO_REFERENCE_DATE}T06:00`
    const refill = (
      await post('/fleet/fuel-refills', {
        refueledAt: at,
        vehicleNo: 'VEH-001',
        liters: 210,
        unitPrice: 5500,
        odometerKm: 182_390,
        fullTank: false,
        stationName: 'Station Galana'
      })
    ).data.data as FuelRefillApi
    const line = {
      cardNumber: '7089120000014021',
      transactedAt: `${DEMO_REFERENCE_DATE}T06:04`,
      station: 'Station Galana',
      city: 'Antananarivo',
      liters: 210,
      amount: 1_155_000
    }
    const response = await post('/fleet/fuel-card-transactions/import', {
      rows: [line, { ...line, cardNumber: '0000' }, line]
    })
    const report = response.data.data as ImportReport & { matched: number }
    expect(report).toMatchObject({ created: 1, rejected: 2 })
    expect(report.matched).toBeGreaterThanOrEqual(1)
    expect(report.results[1]?.error).toBe('No fuel card has the number "0000".')
    const imported = (await list<FuelCardTransactionApi>('/fleet/fuel-card-transactions')).find(
      (row) => row.no === report.results[0]?.no
    )
    expect(imported).toMatchObject({ refillNo: refill.no, matchMode: 'auto' })
    expect(
      (await post('/fleet/fuel-card-transactions/import', { rows: [line] }, 'MNT001')).status
    ).toBe(403)
    expect((await post('/fleet/fuel-card-transactions/import', { rows: [] })).status).toBe(422)
  })
})

describe('reference consumption per vehicle and corridor', () => {
  it('take the reference of the vehicle first, unique on each corridor', async () => {
    const periods = await list<FuelConsumptionApi>('/fleet/fuel-consumption')
    const veh1 = periods.filter((period) => period.vehicleNo === 'VEH-001')
    expect(veh1.every((period) => period.referenceSource === 'vehicle')).toBe(true)
    expect(veh1[0]?.referenceL100).toBe(35.5)
    const veh2 = periods.find((period) => period.vehicleNo === 'VEH-002')
    expect(veh2?.referenceSource).toBe('vehicleType')

    const create = (body: Record<string, unknown>, as = 'FLT001') =>
      post('/fleet/fuel-references', { vehicleNo: 'VEH-002', referenceL100: 36, ...body }, as)
    expect((await create({}, 'MNT001')).status).toBe(403)
    expect((await create({ referenceL100: 2 })).status).toBe(400)
    expect((await create({})).status).toBe(201)
    expect((await create({})).status).toBe(409)
    expect((await create({ routeTemplateNo: 'TNR-TOA', referenceL100: 38 })).status).toBe(201)
    const after = (await list<FuelConsumptionApi>('/fleet/fuel-consumption')).find(
      (period) => period.vehicleNo === 'VEH-002'
    )
    expect(after).toMatchObject({ referenceSource: 'vehicle', referenceL100: 36 })
  })
})

describe('emissions', () => {
  it('follow the share of low-emission vehicles in the motorized park', async () => {
    const summary = (await call(server, 'get', '/fleet/fuel-consumption/summary', { as: 'FLT001' }))
      .data.data as FuelConsumptionSummary
    expect(summary.lowEmissionVehicles).toBe(0)
    expect(summary.motorizedVehicles).toBeGreaterThan(0)
    expect(summary.lowEmissionSharePct).toBe(0)
    server.db.vehicles.update('VEH-010', { fuelType: 'electric' })
    const after = (await call(server, 'get', '/fleet/fuel-consumption/summary', { as: 'FLT001' }))
      .data.data as FuelConsumptionSummary
    expect(after.lowEmissionVehicles).toBe(1)
    expect(after.lowEmissionSharePct).toBe(Math.round((1 / after.motorizedVehicles) * 100))
  })
})
