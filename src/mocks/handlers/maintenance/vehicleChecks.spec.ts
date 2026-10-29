import { beforeEach, describe, expect, it } from 'vitest'
import type { VehicleApi } from '@/modules/fleet/vehicles/types/vehicle.types'
import type { VehicleCheckApi } from '@/modules/maintenance/vehicle-checks/types/vehicleCheck.types'
import type { WorkOrderApi } from '@/modules/maintenance/work-orders/types/workOrder.types'
import { DEMO_REFERENCE_DATE } from '../../clock'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const allOk = {
  'BL-FRN': 'ok',
  'BL-PNE': 'ok',
  'BL-ECL': 'ok',
  'BL-ATT': 'ok',
  'BL-NIV': 'ok',
  'BL-PLA': 'ok'
}

const record = (body: Record<string, unknown>, as = 'MNT001') =>
  call(server, 'post', '/maintenance/vehicle-checks', {
    as,
    language: 'en',
    body: {
      moment: 'before_loading',
      vehicleNo: 'VEH-003',
      checkedAt: `${DEMO_REFERENCE_DATE}T07:30`,
      odometerKm: 201_300,
      results: allOk,
      ...body
    }
  })

async function get<T>(path: string) {
  return (await call(server, 'get', path, { as: 'FLT001', language: 'en' })).data.data as T
}

describe('vehicle checks', () => {
  it('freeze the points as they stood and derive the outcome', async () => {
    expect(await get<VehicleCheckApi>('/maintenance/vehicle-checks/CTL-00001')).toMatchObject({
      vehiclePlate: '4021 TBA',
      anomalyCount: 1,
      outcome: 'anomaly',
      workOrderNo: null
    })
    const ok = (await record({})).data.data as VehicleCheckApi
    expect(ok).toMatchObject({ no: 'CTL-00003', outcome: 'ok', checkedBy: 'MNT001' })
    expect(ok.results[0]).toEqual({
      pointNo: 'BL-FRN',
      label: 'Freinage',
      blocking: true,
      result: 'ok'
    })
  })

  it('ask for every point, a past date and the right to record', async () => {
    expect((await record({ results: { 'BL-FRN': 'ok' } })).status).toBe(422)
    expect((await record({ checkedAt: '2099-01-01T08:00' })).status).toBe(422)
    expect((await record({}, 'DIR001')).status).toBe(403)
  })

  it('open a major order on a blocking anomaly only', async () => {
    const minor = (await record({ results: { ...allOk, 'BL-NIV': 'anomaly' } })).data
      .data as VehicleCheckApi
    expect(minor).toMatchObject({ outcome: 'anomaly', workOrderNo: null })

    const blocking = (
      await record({ results: { ...allOk, 'BL-FRN': 'anomaly' }, comment: 'Pédale molle.' })
    ).data.data as VehicleCheckApi
    expect(blocking.outcome).toBe('blocking')
    const order = await get<WorkOrderApi>(`/maintenance/work-orders/${blocking.workOrderNo}`)
    expect(order).toMatchObject({
      origin: 'vehicle_check',
      originNo: blocking.no,
      severity: 'major',
      symptom: 'Vehicle check: Freinage failed. Pédale molle.'
    })
    expect(order.downtimeNo).not.toBeNull()
    expect((await get<VehicleApi>('/fleet/vehicles/VEH-003')).status).toBe('in_maintenance')
  })
})
