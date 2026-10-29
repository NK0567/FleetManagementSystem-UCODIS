import { beforeEach, describe, expect, it } from 'vitest'
import type { ImportReport } from '@/core/utils/csvImport'
import type { VehicleApi } from '@/modules/fleet/vehicles/types/vehicle.types'
import type {
  VehicleMaintenanceEntry,
  VehicleOwnershipCostApi
} from '@/modules/fleet/vehicles/types/vehicleRecords.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const vehicle = async (no: string) =>
  (await call(server, 'get', `/fleet/vehicles/${no}`, { as: 'FLT001', language: 'fr' })).data
    .data as VehicleApi

const importRows = (rows: Record<string, unknown>[], as = 'FLT001') =>
  call(server, 'post', '/fleet/vehicles/import', { as, body: { rows }, language: 'fr' })

const NEW_TRACTOR = {
  plate: '5120 tbc',
  vin: 'LZZ5ELND9KN000123',
  vehicleTypeNo: 'Tracteur',
  make: 'Sinotruk',
  model: 'Howo A7',
  homeSiteNo: 'DEP-TNJ',
  odometerKm: 12500
}

describe('vehicle status', () => {
  it('tells maintenance from immobilization, with the coded cause of the codification', async () => {
    expect(await vehicle('VEH-008')).toMatchObject({
      status: 'in_maintenance',
      operationalStatus: 'in_maintenance',
      administrativeStatus: 'in_service',
      statusCauseCode: 'PNN'
    })
    expect(await vehicle('VEH-005')).toMatchObject({
      status: 'immobilized',
      statusCauseCode: 'DOC',
      statusCauseCodeName: 'Document obligatoire expiré'
    })
    expect((await vehicle('VEH-022')).statusCauseCode).toBe('CVI')
    expect(server.db.downtimeCodes.findOrFail('DOC').family).toBe('regulatory')
  })

  it('keeps the administrative status apart once the vehicle left the park', async () => {
    const removed = server.db.vehicles.all().find((row) => row.removal)
    if (!removed) return
    expect(await vehicle(removed.no)).toMatchObject({
      status: 'removed',
      administrativeStatus: 'removed',
      operationalStatus: null
    })
  })
})

describe('vehicle import', () => {
  it('creates the vehicles of the file and refuses duplicates line by line', async () => {
    const response = await importRows([
      NEW_TRACTOR,
      { ...NEW_TRACTOR, vin: 'OTHERVIN0000001' },
      { ...NEW_TRACTOR, plate: '5121 TBC' },
      { ...NEW_TRACTOR, plate: '4021 TBA', vin: 'OTHERVIN0000002' },
      { ...NEW_TRACTOR, plate: '5122 TBC', vin: 'OTHERVIN0000003', vehicleTypeNo: 'Inconnu' }
    ])
    expect(response.status).toBe(200)
    const report = response.data.data as ImportReport
    expect(report).toMatchObject({ created: 1, rejected: 4 })
    expect(report.results.map((result) => !!result.error)).toEqual([false, true, true, true, true])
    const created = server.db.vehicles.find(report.results[0]!.no!)
    expect(created).toMatchObject({
      plate: '5120 TBC',
      vehicleTypeNo: 'TRACTOR',
      homeSiteNo: 'DEP-TNJ',
      odometerKm: 12500
    })
  })

  it('is kept for the profiles that may add vehicles, and refuses an empty file', async () => {
    expect((await importRows([NEW_TRACTOR], 'PLN001')).status).toBe(403)
    expect((await importRows([NEW_TRACTOR], 'DIR001')).status).toBe(403)
    expect((await importRows([])).status).toBe(422)
  })
})

describe('vehicle maintenance log and ownership cost', () => {
  it('lists the work orders and plan operations, for those who follow the maintenance', async () => {
    const log = (
      await call(server, 'get', '/fleet/vehicles/VEH-001/maintenance-log', { as: 'MNT001' })
    ).data.data as VehicleMaintenanceEntry[]
    expect(log.some((entry) => entry.kind === 'work_order' && entry.no === 'OT-2026-0001')).toBe(
      true
    )
    expect(log.some((entry) => entry.kind === 'service' && entry.no === 'PAS-00004')).toBe(true)
    expect(log.map((entry) => entry.date)).toEqual(
      [...log.map((entry) => entry.date)].sort().reverse()
    )
    expect(
      (await call(server, 'get', '/fleet/vehicles/VEH-001/maintenance-log', { as: 'PLN001' }))
        .status
    ).toBe(403)
  })

  it('adds the acquisition to the running costs recorded since the vehicle came in', async () => {
    const cost = (
      await call(server, 'get', '/fleet/vehicles/VEH-001/ownership-cost', { as: 'DIR001' })
    ).data.data as VehicleOwnershipCostApi
    expect(cost.acquisition).toBe(185_000_000)
    expect(cost.total).toBe(
      cost.acquisition + cost.maintenance + cost.fuel + cost.tyres + cost.insurance
    )
    expect(cost.maintenance + cost.fuel).toBeGreaterThan(0)
    expect(
      (await call(server, 'get', '/fleet/vehicles/VEH-001/ownership-cost', { as: 'PLN001' })).status
    ).toBe(403)
  })
})
