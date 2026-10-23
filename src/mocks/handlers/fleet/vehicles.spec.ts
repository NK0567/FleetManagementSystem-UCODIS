import { beforeEach, describe, expect, it } from 'vitest'
import type { VehicleTypeApi } from '@/modules/fleet/vehicle-types/types/vehicleType.types'
import type { VehicleApi, VehicleEquipmentApi } from '@/modules/fleet/vehicles/types/vehicle.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

async function vehicle(no: string, language: 'fr' | 'en' = 'fr') {
  return (await call(server, 'get', `/fleet/vehicles/${no}`, { as: 'FLT001', language })).data
    .data as VehicleApi
}

const newTractor = {
  plate: '4031 tba',
  vin: 'lzgjtr2024099',
  vehicleTypeNo: 'TRACTOR',
  make: 'Sinotruk',
  model: 'Howo A7',
  homeSiteNo: 'DEP-TNJ',
  fuelType: 'diesel',
  tankCapacityL: 500,
  odometerKm: 1200
}

describe('vehicle status', () => {
  it('derives the status from the facts instead of storing it', async () => {
    expect(await vehicle('VEH-001')).toMatchObject({ status: 'available', statusReason: '' })
    expect(await vehicle('VEH-009', 'en')).toMatchObject({
      status: 'out_of_service',
      statusReason: 'Out of service: Accident, expertise en cours.'
    })
  })

  it('reads the capabilities from the equipment, not from type codes', async () => {
    expect(await vehicle('VEH-001')).toMatchObject({ hasTracker: true, hasCamera: true })
    expect(await vehicle('VEH-002')).toMatchObject({ hasTracker: true, hasCamera: false })
    expect((await vehicle('VEH-023')).hasPump).toBe(true)
  })
})

describe('vehicle creation', () => {
  it('normalizes the plate and records the first odometer reading', async () => {
    const response = await call(server, 'post', '/fleet/vehicles', {
      as: 'FLT001',
      body: newTractor
    })
    expect(response.status).toBe(201)
    const created = response.data.data as VehicleApi
    expect(created).toMatchObject({ no: 'VEH-025', plate: '4031 TBA', vin: 'LZGJTR2024099' })
    expect(created.odometerReadings).toHaveLength(1)
  })

  it('refuses a plate already used, even with another case or spacing', async () => {
    const response = await call(server, 'post', '/fleet/vehicles', {
      as: 'FLT001',
      body: { ...newTractor, plate: '4021  tba' }
    })
    expect(response.status).toBe(409)
  })

  it('drops engine data on a towed vehicle and requires compartments on a tanker', async () => {
    const trailer = await call(server, 'post', '/fleet/vehicles', {
      as: 'FLT001',
      body: { ...newTractor, vin: 'SR1', plate: 'RM 4199', vehicleTypeNo: 'SEMI-TRAILER' }
    })
    expect((trailer.data.data as VehicleApi).tankCapacityL).toBeNull()

    const tanker = await call(server, 'post', '/fleet/vehicles', {
      as: 'FLT001',
      body: { ...newTractor, vin: 'CT1', plate: 'CT 4299', vehicleTypeNo: 'TANKER' }
    })
    expect(tanker.status).toBe(422)
  })
})

describe('vehicle actions', () => {
  it('keeps the former plate in the history and still finds the vehicle by it', async () => {
    const response = await call(server, 'post', '/fleet/vehicles/VEH-001/plate', {
      as: 'FLT001',
      body: { plate: '5021 TBA', reason: 'Nouvelle série' }
    })
    expect(response.status).toBe(200)
    const found = await call(server, 'get', '/fleet/vehicles', {
      as: 'FLT001',
      query: { searchQuery: '4021 TBA', searchColumns: 'no,plate,vin,formerPlates' }
    })
    expect((found.data.data as { items: VehicleApi[] }).items.map((item) => item.no)).toEqual([
      'VEH-001'
    ])
    const reuse = await call(server, 'post', '/fleet/vehicles', {
      as: 'FLT001',
      body: { ...newTractor, plate: '4021 TBA' }
    })
    expect(reuse.status).toBe(409)
  })

  it('refuses an odometer reading below the last one', async () => {
    const response = await call(server, 'post', '/fleet/vehicles/VEH-001/odometer', {
      as: 'FLT001',
      body: { km: 1000 }
    })
    expect(response.status).toBe(422)
  })

  it('puts a vehicle out of service with a reason and back', async () => {
    const withoutReason = await call(server, 'post', '/fleet/vehicles/VEH-001/out-of-service', {
      as: 'FLT001',
      body: {}
    })
    expect(withoutReason.status).toBe(422)
    await call(server, 'post', '/fleet/vehicles/VEH-001/out-of-service', {
      as: 'FLT001',
      body: { reason: 'Pare-brise fêlé' }
    })
    expect((await vehicle('VEH-001')).status).toBe('out_of_service')
    await call(server, 'post', '/fleet/vehicles/VEH-001/return-to-service', { as: 'FLT001' })
    expect((await vehicle('VEH-001')).status).toBe('available')
  })

  it('freezes a removed vehicle', async () => {
    await call(server, 'post', '/fleet/vehicles/VEH-020/remove', {
      as: 'FLT001',
      body: { reason: 'Vendue', date: '2026-09-01' }
    })
    expect((await vehicle('VEH-020')).status).toBe('removed')
    const edit = await call(server, 'patch', '/fleet/vehicles/VEH-020', {
      as: 'FLT001',
      body: { model: 'Autre' }
    })
    expect(edit.status).toBe(409)
  })

  it('lets only the managers run actions', async () => {
    const response = await call(server, 'post', '/fleet/vehicles/VEH-001/out-of-service', {
      as: 'DIR001',
      body: { reason: 'Test' }
    })
    expect(response.status).toBe(403)
  })
})

describe('equipment', () => {
  it('requires the due date of a type that has one and refuses a serial already installed', async () => {
    const missingDue = await call(server, 'post', '/fleet/vehicles/VEH-002/equipment', {
      as: 'FLT001',
      body: { equipmentTypeNo: 'EXTINGUISHER', serialNumber: 'EXT-9' }
    })
    expect(missingDue.status).toBe(422)

    const twin = await call(server, 'post', '/fleet/vehicles/VEH-002/equipment', {
      as: 'FLT001',
      body: { equipmentTypeNo: 'GPS', serialNumber: 'GPS-2024001' }
    })
    expect(twin.status).toBe(409)
  })

  it('reports an extinguisher past its due date', async () => {
    const list = (await call(server, 'get', '/fleet/vehicles/VEH-004/equipment', { as: 'FLT001' }))
      .data.data as VehicleEquipmentApi[]
    expect(list.find((item) => item.equipmentTypeNo === 'EXTINGUISHER')?.dueState).toBe('overdue')
  })
})

describe('reference guards', () => {
  it('freezes the structure of a vehicle type in use and keeps it from deletion', async () => {
    const types = (await call(server, 'get', '/fleet/vehicle-types', { as: 'FLT001' })).data
      .data as { items: VehicleTypeApi[] }
    expect(types.items.find((type) => type.no === 'TRACTOR')?.vehicleCount).toBe(10)

    const change = await call(server, 'patch', '/fleet/vehicle-types/TRACTOR', {
      as: 'FLT001',
      body: { carriesGoods: true }
    })
    expect(change.status).toBe(409)
    const rename = await call(server, 'patch', '/fleet/vehicle-types/TRACTOR', {
      as: 'FLT001',
      body: { name: 'Tracteur routier' }
    })
    expect(rename.status).toBe(200)
    expect(
      (await call(server, 'delete', '/fleet/vehicle-types/TANKER', { as: 'FLT001' })).status
    ).toBe(409)
  })

  it('keeps a site that is the home site of vehicles active', async () => {
    const response = await call(server, 'patch', '/fleet/sites/ENT-TNJ', {
      as: 'FLT001',
      body: { active: false }
    })
    expect(response.status).toBe(409)
  })
})
