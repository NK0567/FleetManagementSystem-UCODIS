import { beforeEach, describe, expect, it } from 'vitest'
import type {
  MobileInterventionApi,
  MobileTeamSummary
} from '@/modules/maintenance/mobile-interventions/types/mobileIntervention.types'
import type { WorkOrderApi } from '@/modules/maintenance/work-orders/types/workOrder.types'
import { DEMO_REFERENCE_DATE } from '../../clock'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const post = (path: string, body: Record<string, unknown> = {}, as = 'MNT001') =>
  call(server, 'post', `/maintenance/mobile-interventions${path}`, { as, body, language: 'en' })

async function get<T>(path: string) {
  return (await call(server, 'get', path, { as: 'FLT001', language: 'en' })).data.data as T
}

const dispatch = (body: Record<string, unknown> = {}, as = 'MNT001') =>
  post(
    '',
    {
      missionTypeNo: 'MECHANICAL',
      vehicleNo: 'VEH-002',
      location: 'RN7, PK 18',
      departedAt: `${DEMO_REFERENCE_DATE}T08:00`,
      crewNos: ['UCT-003'],
      ...body
    },
    as
  )

describe('mobile interventions', () => {
  it('dispatch an active crew, once per vehicle, never ahead of time', async () => {
    expect((await dispatch({ crewNos: [] })).status).toBe(422)
    expect((await dispatch({ departedAt: '2099-01-01T08:00' })).status).toBe(422)
    expect((await dispatch({ vehicleNo: 'VEH-009' })).status).toBe(409)
    expect((await dispatch({}, 'DIR001')).status).toBe(403)
    expect((await dispatch()).data.data).toMatchObject({
      no: 'IM-2026-0004',
      status: 'en_route',
      crewNames: 'Tojo Rasoanaivo'
    })
  })

  it('count checks on control missions only, positives within the checks', async () => {
    expect((await post('/IM-2026-0003/checks', { checkCount: 3, positiveCount: 0 })).status).toBe(
      409
    )
    const { no } = (await dispatch({ missionTypeNo: 'ALCOHOL-DRUGS' })).data
      .data as MobileInterventionApi
    expect((await post(`/${no}/checks`, { checkCount: 3, positiveCount: 4 })).status).toBe(422)
    expect(
      (await post(`/${no}/checks`, { checkCount: 9, positiveCount: 2 })).data.data
    ).toMatchObject({
      checkCount: 9,
      positiveCount: 2
    })
  })

  it('close after arrival, and pass an unsolved breakdown to the workshop', async () => {
    const { no } = (await dispatch()).data.data as MobileInterventionApi
    expect((await post(`/${no}/close`, { resolved: true })).status).toBe(422)
    expect(
      (await post(`/${no}/arrive`, { arrivedAt: `${DEMO_REFERENCE_DATE}T07:00` })).status
    ).toBe(422)
    expect(
      (
        (await post(`/${no}/arrive`, { arrivedAt: `${DEMO_REFERENCE_DATE}T08:45` })).data
          .data as MobileInterventionApi
      ).delayMin
    ).toBe(45)
    expect((await post(`/${no}/close`, { resolved: false, observation: 'Non' })).status).toBe(422)
    const closed = (
      await post(`/${no}/close`, {
        resolved: false,
        observation: 'Embrayage patine, remorquage vers le dépôt.',
        openWorkOrder: true
      })
    ).data.data as MobileInterventionApi
    expect(closed.status).toBe('unresolved')
    expect(await get<WorkOrderApi>(`/maintenance/work-orders/${closed.workOrderNo}`)).toMatchObject(
      {
        origin: 'mobile_team',
        originNo: no,
        severity: 'major'
      }
    )
    expect((await post(`/${no}/arrive`)).status).toBe(409)
  })

  it('measure the calendar month against the targets', async () => {
    const summary = (
      await call(server, 'get', '/maintenance/mobile-interventions/summary', {
        as: 'FLT001',
        query: { month: '2026-08' }
      })
    ).data.data as MobileTeamSummary
    expect(summary).toMatchObject({
      month: '2026-08',
      kpis: { interventions: 2, resolutionRate: 100, checks: 14, positives: 1 },
      targets: { interventionsPerMonth: 10 }
    })
  })
})
