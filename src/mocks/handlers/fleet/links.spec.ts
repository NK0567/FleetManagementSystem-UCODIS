import { beforeEach, describe, expect, it } from 'vitest'
import type { CouplingApi } from '@/modules/fleet/couplings/types/coupling.types'
import type { DriverApi } from '@/modules/fleet/drivers/types/driver.types'
import type { VehicleApi } from '@/modules/fleet/vehicles/types/vehicle.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

async function get<T>(path: string, language: 'fr' | 'en' = 'en') {
  return (await call(server, 'get', path, { as: 'FLT001', language })).data.data as T
}

const couple = (tractorNo: string, trailerNo: string, startDate = '2026-09-01') =>
  call(server, 'post', '/fleet/couplings', {
    as: 'FLT001',
    body: { tractorNo, trailerNo, startDate }
  })

const assign = (employeeNo: string, vehicleNo: string, startDate = '2026-09-01') =>
  call(server, 'post', '/fleet/driver-assignments', {
    as: 'FLT001',
    body: { employeeNo, vehicleNo, startDate }
  })

describe('vehicle status from links', () => {
  it('names the driver, then the coupled vehicle', async () => {
    expect(await get<VehicleApi>('/fleet/vehicles/VEH-001')).toMatchObject({
      status: 'assigned',
      driverName: 'Solofo Rakotomanga',
      coupledVehiclePlate: 'RM 4101'
    })
    expect(await get<VehicleApi>('/fleet/vehicles/VEH-007')).toMatchObject({
      status: 'assigned',
      statusReason: 'Coupled with RM 4107'
    })
    expect((await get<VehicleApi>('/fleet/vehicles/VEH-019')).status).toBe('available')
  })
})

describe('couplings', () => {
  it('only couples a tractor with a trailer', async () => {
    expect((await couple('VEH-019', 'VEH-009')).status).toBe(422)
  })

  it('refuses a vehicle already coupled or out of service', async () => {
    expect((await couple('VEH-001', 'VEH-019')).status).toBe(409)
    const outOfService = await couple('VEH-009', 'VEH-019')
    expect(outOfService.status).toBe(422)
    expect(outOfService.data.message).toContain('4029 TBA')
  })

  it('uncouples, then refuses a new start before that end', async () => {
    const end = await call(server, 'post', '/fleet/couplings/CPL-0001/end', {
      as: 'FLT001',
      body: { endDate: '2026-09-02' }
    })
    expect((end.data.data as CouplingApi).state).toBe('ended')
    expect((await couple('VEH-001', 'VEH-019', '2026-09-01')).status).toBe(422)
    const created = await couple('VEH-001', 'VEH-019', '2026-09-02')
    expect(created.status).toBe(201)
    expect((created.data.data as CouplingApi).no).toBe('CPL-0010')
  })

  it('refuses an end in the future and a second end', async () => {
    const future = await call(server, 'post', '/fleet/couplings/CPL-0001/end', {
      as: 'FLT001',
      body: { endDate: '2099-01-01' }
    })
    expect(future.status).toBe(422)
    await call(server, 'post', '/fleet/couplings/CPL-0001/end', {
      as: 'FLT001',
      body: { endDate: '2026-09-02' }
    })
    const again = await call(server, 'post', '/fleet/couplings/CPL-0001/end', {
      as: 'FLT001',
      body: { endDate: '2026-09-03' }
    })
    expect(again.status).toBe(409)
  })
})

describe('driver assignments', () => {
  it('assigns a free eligible driver to a free vehicle', async () => {
    const response = await assign('UCT-014', 'VEH-007')
    expect(response.status).toBe(201)
    expect((await get<VehicleApi>('/fleet/vehicles/VEH-007')).driverName).toBe(
      'Fenohery Randriamampionona'
    )
  })

  it('refuses a driver who is not authorized, suspended or on leave, and says why', async () => {
    const notAuthorized = await assign('UCT-016', 'VEH-007')
    expect(notAuthorized.status).toBe(422)
    expect(notAuthorized.data.message).toContain('not authorized')
    expect((await assign('UCT-018', 'VEH-007')).data.message).toContain('suspended')
  })

  it('keeps one driver per vehicle and one vehicle per driver', async () => {
    expect((await assign('UCT-014', 'VEH-001')).status).toBe(409)
    expect((await assign('UCT-010', 'VEH-007')).status).toBe(409)
  })

  it('only assigns drivers to motorized vehicles', async () => {
    expect((await assign('UCT-014', 'VEH-019')).status).toBe(422)
  })

  it('keeps a linked vehicle from leaving the fleet', async () => {
    const response = await call(server, 'post', '/fleet/vehicles/VEH-001/remove', {
      as: 'FLT001',
      body: { reason: 'Vendu', date: '2026-09-01' }
    })
    expect(response.status).toBe(409)
  })
})

describe('drivers', () => {
  it('lists the employees whose position drives, with availability and eligibility', async () => {
    const drivers = (await get<{ items: DriverApi[] }>('/fleet/drivers?pageSize=50')).items
    expect(drivers).toHaveLength(15)
    expect(drivers.find((driver) => driver.no === 'UCT-010')).toMatchObject({
      vehiclePlate: '4021 TBA',
      availability: 'available',
      eligible: true
    })
    expect(drivers.find((driver) => driver.no === 'UCT-018')).toMatchObject({
      availability: 'unavailable',
      eligible: false
    })
    expect(drivers.find((driver) => driver.no === 'UCT-017')?.availability).toBe('on_leave')
  })

  it('is read-only', async () => {
    const response = await call(server, 'post', '/fleet/drivers', { as: 'FLT001', body: {} })
    expect(response.status).toBeGreaterThanOrEqual(400)
  })
})
