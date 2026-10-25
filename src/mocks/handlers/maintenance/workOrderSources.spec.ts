import { beforeEach, describe, expect, it } from 'vitest'
import type { ClaimApi } from '@/modules/fleet/claims/types/claim.types'
import type { RoadChecklistApi } from '@/modules/fleet/road-checklists/types/roadChecklist.types'
import type { TelematicsEventApi } from '@/modules/fleet/telematics-events/types/telematicsEvent.types'
import type { WorkOrderApi } from '@/modules/maintenance/work-orders/types/workOrder.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const open = (origin: string, originNo: string, as = 'FLT001') =>
  call(server, 'post', '/maintenance/work-orders/from-source', {
    as,
    body: { origin, originNo },
    language: 'en'
  })

async function list<T>(path: string) {
  return (
    (await call(server, 'get', path, { as: 'FLT001', query: { pageSize: 200 }, language: 'en' }))
      .data.data as { items: T[] }
  ).items
}

async function get<T>(path: string) {
  return (await call(server, 'get', path, { as: 'FLT001', language: 'en' })).data.data as T
}

describe('work orders from fleet records', () => {
  it('open a repair from a claim, once, and hold the claim until it is done', async () => {
    const order = (await open('claim', 'SIN-2026-002')).data.data as WorkOrderApi
    expect(order).toMatchObject({
      vehicleNo: 'VEH-006',
      origin: 'claim',
      originNo: 'SIN-2026-002',
      severity: 'minor'
    })
    expect((await open('claim', 'SIN-2026-002')).status).toBe(409)
    expect((await open('claim', 'SIN-2026-001')).status).toBe(409)
    expect(await get<ClaimApi>('/fleet/claims/SIN-2026-002')).toMatchObject({
      workOrderNo: order.no,
      repairOpen: true
    })
    const close = await call(server, 'post', '/fleet/claims/SIN-2026-002/close', {
      as: 'FLT001',
      language: 'en'
    })
    expect(close.status).toBe(422)
    expect(close.data.message).toContain('the repair is still under way')

    await call(server, 'post', `/maintenance/work-orders/${order.no}/cancel`, {
      as: 'FLT001',
      body: { reason: 'Réparation prise en charge par le tiers.' }
    })
    expect(await get<ClaimApi>('/fleet/claims/SIN-2026-002')).toMatchObject({
      workOrderNo: null,
      repairOpen: false
    })
  })

  it('open from a failed inspection, a fault event and a checklist anomaly only', async () => {
    expect((await open('inspection', 'INS-00004')).data.data).toMatchObject({
      vehicleNo: 'VEH-022',
      severity: 'major',
      symptom:
        'Failed inspection: Jeu excessif dans la direction ; fuite au raccord de la vanne de fond.'
    })
    expect((await open('inspection', 'INS-00003')).status).toBe(422)
    expect((await open('inspection', 'INS-00001')).status).toBe(422)

    const events = await list<TelematicsEventApi>('/fleet/telematics-events')
    const fault = events.find((event) => event.eventTypeNo === 'ENGINE-FAULT')!
    const behavior = events.find((event) => event.eventTypeNo === 'SPEEDING')!
    expect((await open('telematics', fault.no)).data.data).toMatchObject({ vehicleNo: 'VEH-006' })
    expect((await open('telematics', behavior.no)).status).toBe(422)
    expect(
      (await list<TelematicsEventApi>('/fleet/telematics-events')).find(
        (event) => event.no === fault.no
      )?.workOrderNo
    ).not.toBeNull()

    const checklists = await list<RoadChecklistApi>('/fleet/road-checklists')
    const failed = checklists.find((checklist) => checklist.anomalyCount > 0)!
    const clean = checklists.find((checklist) => checklist.anomalyCount === 0)!
    expect((await open('road_checklist', failed.no)).data.data).toMatchObject({
      vehicleNo: failed.vehicleNo,
      severity: failed.blocking ? 'major' : 'minor'
    })
    expect((await open('road_checklist', clean.no)).status).toBe(422)
    expect((await open('road_checklist', clean.no, 'DIR001')).status).toBe(403)
  })
})
