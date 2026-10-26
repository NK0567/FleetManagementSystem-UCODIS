import { beforeEach, describe, expect, it } from 'vitest'
import type { WorkOrderApi } from '@/modules/maintenance/work-orders/types/workOrder.types'
import type { WorkshopLoadApi } from '@/modules/maintenance/workshop-load/types/workshopLoad.types'
import { addDays } from '@/utils/date'
import { DEMO_REFERENCE_DATE } from '../../clock'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const post = (path: string, body: Record<string, unknown> = {}, as = 'FLT001') =>
  call(server, 'post', `/maintenance${path}`, { as, body, language: 'en' })

const load = async () =>
  (await call(server, 'get', '/maintenance/workshop-load', { as: 'MNT001', language: 'en' })).data
    .data as WorkshopLoadApi

const tomorrow = addDays(DEMO_REFERENCE_DATE, 1)

async function electricalFault() {
  const { no } = (
    await post('/work-orders', {
      vehicleNo: 'VEH-003',
      maintenanceType: 'corrective',
      severity: 'minor',
      origin: 'workshop_finding',
      symptom: 'Tableau de bord éteint par intermittence.',
      declaredAt: `${DEMO_REFERENCE_DATE}T08:00`
    })
  ).data.data as WorkOrderApi
  await post(`/work-orders/${no}/diagnose`, {
    subsystemNo: 'ELECTRONICS',
    modeNo: 'ELECTRICAL-FAULT',
    causeNo: 'ENVIRONMENT'
  })
  return no
}

describe('workshop load', () => {
  it('weigh the planned jobs against a working week', async () => {
    expect(await load()).toMatchObject({
      capacityHoursPerDay: 16,
      workingDaysPerWeek: 6,
      loadHours: 3,
      occupancyRate: 3,
      daysToAbsorb: 1,
      unplannedCount: 0
    })
    const technicians = (await load()).technicians
    expect(technicians.find((technician) => technician.no === 'UCT-003')).toMatchObject({
      plannedHours: 3,
      jobs: [expect.objectContaining({ no: 'OT-2026-0003' })]
    })
  })

  it('plan only active and competent technicians, from today on', async () => {
    const no = await electricalFault()
    expect((await load()).unplanned.map((job) => job.no)).toEqual([no])
    const plan = (body: Record<string, unknown>, as = 'MNT001') =>
      post(
        `/work-orders/${no}/plan`,
        { date: tomorrow, estimatedHours: 4, technicianNos: ['UCT-008'], ...body },
        as
      )
    expect((await plan({ technicianNos: ['UCT-003'] })).status).toBe(422)
    expect((await plan({ technicianNos: [] })).status).toBe(422)
    expect((await plan({ date: addDays(DEMO_REFERENCE_DATE, -1) })).status).toBe(422)
    expect((await plan({}, 'DIR001')).status).toBe(403)
    expect(((await plan({})).data.data as WorkOrderApi).planning).toEqual({
      date: tomorrow,
      estimatedHours: 4,
      technicianNos: ['UCT-008']
    })
    await post(
      `/work-orders/${no}/labour`,
      { technicianNo: 'UCT-008', date: DEMO_REFERENCE_DATE, hours: 1.5 },
      'MNT001'
    )
    expect(await load()).toMatchObject({ loadHours: 5.5, unplannedCount: 0 })
  })

  it('leave outside jobs to their garage', async () => {
    await post('/work-orders/OT-2026-0003/hand-over', {
      providerNo: 'PRS-001',
      handedOverAt: `${DEMO_REFERENCE_DATE}T09:00`
    })
    expect((await load()).loadHours).toBe(0)
    expect(
      (
        await post('/work-orders/OT-2026-0003/plan', {
          date: tomorrow,
          estimatedHours: 2,
          technicianNos: ['UCT-003']
        })
      ).status
    ).toBe(409)
  })
})
