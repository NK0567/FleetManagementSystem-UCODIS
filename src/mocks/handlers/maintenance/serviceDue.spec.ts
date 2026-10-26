import { beforeEach, describe, expect, it } from 'vitest'
import type { VehicleApi } from '@/modules/fleet/vehicles/types/vehicle.types'
import type { MaintenancePlanApi } from '@/modules/maintenance/maintenance-plans/types/maintenancePlan.types'
import type { ServiceDueApi } from '@/modules/maintenance/service-due/types/serviceDue.types'
import type { WorkOrderApi } from '@/modules/maintenance/work-orders/types/workOrder.types'
import { addDays } from '@/utils/date'
import { DEMO_REFERENCE_DATE } from '../../clock'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const send = (
  method: 'post' | 'patch' | 'delete',
  path: string,
  body: Record<string, unknown> = {},
  as = 'FLT001'
) => call(server, method, path, { as, body, language: 'en' })

async function get<T>(path: string) {
  return (await call(server, 'get', path, { as: 'FLT001', language: 'en' })).data.data as T
}

const due = (no: string) => get<ServiceDueApi>(`/maintenance/service-due/${no}`)
const plan = (no: string) => get<MaintenancePlanApi>(`/maintenance/maintenance-plans/${no}`)

describe('maintenance plans', () => {
  it('number new operations and refuse an incomplete one', async () => {
    const operations = (await plan('PE-002')).operations
    const saved = await send('patch', '/maintenance/maintenance-plans/PE-002', {
      operations: [
        ...operations,
        {
          label: 'Contrôler les feux',
          subsystemNo: 'ELECTRONICS',
          nature: 'check',
          intervalDays: 30
        }
      ]
    })
    expect((saved.data.data as MaintenancePlanApi).operations.at(-1)).toMatchObject({
      no: 'OP-015',
      intervalKm: null,
      intervalDays: 30
    })
    const invalid = await send('patch', '/maintenance/maintenance-plans/PE-002', {
      operations: [{ label: 'Sans intervalle', subsystemNo: 'ENGINE', nature: 'check' }]
    })
    expect(invalid.status).toBe(422)
    const notSubsystem = await send('patch', '/maintenance/maintenance-plans/PE-002', {
      operations: [{ label: 'Mauvais code', subsystemNo: 'LEAK', nature: 'check', intervalKm: 5 }]
    })
    expect(notSubsystem.status).toBe(422)
  })

  it('keep a vehicle in one active plan, and a plan with vehicles from deletion', async () => {
    const taken = await send('post', '/maintenance/maintenance-plans', {
      name: 'Autre plan',
      vehicleNos: ['VEH-001']
    })
    expect(taken.status).toBe(409)
    const inactive = await send('post', '/maintenance/maintenance-plans', {
      name: 'Plan en préparation',
      active: false,
      vehicleNos: ['VEH-001']
    })
    expect(inactive.status).toBe(201)
    expect((await send('delete', '/maintenance/maintenance-plans/PE-002')).status).toBe(409)
    expect(
      (await send('post', '/maintenance/maintenance-plans', { name: 'X' }, 'MNT001')).status
    ).toBe(403)
  })

  it('duplicate a plan with new operation numbers and no vehicle', async () => {
    const copy = (
      await send('post', '/maintenance/maintenance-plans/PE-002/duplicate', { name: 'Dongfeng KC' })
    ).data.data as MaintenancePlanApi
    expect(copy).toMatchObject({ no: 'PE-003', name: 'Dongfeng KC', vehicleCount: 0 })
    expect(copy.operations.map((operation) => operation.no)).toEqual(['OP-015', 'OP-016'])
  })
})

describe('service due', () => {
  it('derive each operation from its latest passage', async () => {
    expect(await due('VEH-001_OP-001')).toMatchObject({
      lastKm: 180_420,
      nextKm: 190_420,
      kmRemaining: 8_020,
      status: 'upcoming'
    })
    expect(await due('VEH-002_OP-012')).toMatchObject({ kmRemaining: -900, status: 'overdue' })
    expect(await due('VEH-010_OP-013')).toMatchObject({ kmRemaining: 400, status: 'due_soon' })
    expect((await due('VEH-003_OP-001')).status).toBe('unknown')
  })

  it('immobilize past the tolerance once the plan is confirmed', async () => {
    expect((await get<VehicleApi>('/fleet/vehicles/VEH-002')).status).not.toBe('immobilized')
    await send('patch', '/maintenance/maintenance-plans/PE-001', { provisional: false })
    expect((await due('VEH-002_OP-012')).status).toBe('blocking')
    expect(await get<VehicleApi>('/fleet/vehicles/VEH-002')).toMatchObject({
      status: 'immobilized',
      statusReason: 'Service overdue: Vérifier la garniture de frein'
    })
  })

  it('record a passage by hand, within the odometer and up to today', async () => {
    const record = (body: Record<string, unknown>, as = 'MNT001') =>
      send(
        'post',
        '/maintenance/service-due/passages',
        {
          vehicleNo: 'VEH-003',
          operationNo: 'OP-001',
          km: 200_000,
          date: DEMO_REFERENCE_DATE,
          ...body
        },
        as
      )
    expect((await record({ km: 250_000 })).status).toBe(422)
    expect((await record({ date: addDays(DEMO_REFERENCE_DATE, 1) })).status).toBe(422)
    expect((await record({ operationNo: 'OP-013' })).status).toBe(422)
    expect((await record({}, 'DIR001')).status).toBe(403)
    expect((await record({})).data.data).toMatchObject({
      lastKm: 200_000,
      kmRemaining: 8_700,
      status: 'upcoming'
    })
  })

  it('bundle what is due in one preventive order, and record passages at validation', async () => {
    const open = () =>
      send('post', '/maintenance/service-due/work-order', { vehicleNo: 'VEH-002' }, 'MNT001')
    const order = (await open()).data.data as WorkOrderApi
    expect(order).toMatchObject({
      maintenanceType: 'preventive',
      origin: 'preventive',
      serviceOperationNos: ['OP-012'],
      downtimeNo: null
    })
    expect((await due('VEH-002_OP-012')).openOrderNo).toBe(order.no)
    expect((await open()).status).toBe(409)
    expect(
      (await send('post', '/maintenance/service-due/work-order', { vehicleNo: 'VEH-001' })).status
    ).toBe(422)

    const path = `/maintenance/work-orders/${order.no}`
    await send('post', `${path}/diagnose`, { subsystemNo: 'BRAKES' }, 'MNT001')
    await send(
      'post',
      `${path}/labour`,
      { technicianNo: 'UCT-008', date: DEMO_REFERENCE_DATE, hours: 1 },
      'MNT001'
    )
    await send(
      'post',
      `${path}/complete`,
      { workDone: 'Garnitures contrôlées, usure normale.', odometerKm: 165_950 },
      'MNT001'
    )
    expect((await send('post', `${path}/validate`)).status).toBe(200)
    expect(await due('VEH-002_OP-012')).toMatchObject({
      lastKm: 165_950,
      lastDate: DEMO_REFERENCE_DATE,
      openOrderNo: null,
      status: 'upcoming'
    })
  })
})
