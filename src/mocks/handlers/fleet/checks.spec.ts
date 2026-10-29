import { beforeEach, describe, expect, it } from 'vitest'
import type { InspectionApi } from '@/modules/fleet/inspections/types/inspection.types'
import type { RoadChecklistApi } from '@/modules/fleet/road-checklists/types/roadChecklist.types'
import type { VehicleApi } from '@/modules/fleet/vehicles/types/vehicle.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const post = (path: string, body: Record<string, unknown> = {}, as = 'FLT001') =>
  call(server, 'post', path, { as, body })

async function get<T>(path: string) {
  return (await call(server, 'get', path, { as: 'FLT001' })).data.data as T
}

type Verdict = { verdict: string | null; comment?: string }

async function inspectionGrid(vehicleNo: string) {
  return (
    await call(server, 'get', '/fleet/inspections/grid', { as: 'FLT001', query: { vehicleNo } })
  ).data.data as { itemNo: string; part: string }[]
}

async function vehiclePoints() {
  const page = (
    await call(server, 'get', '/fleet/check-points', {
      as: 'FLT001',
      query: {
        pageSize: 100,
        filters: JSON.stringify([{ field: 'scope', valueType: 'string', value: 'vehicle' }])
      }
    })
  ).data.data as { items: { no: string }[] }
  return page.items.map((point) => point.no)
}

async function reading(
  answers: Record<string, { result: string; comment?: string }> = {},
  body = {}
) {
  const results = (await vehiclePoints()).map((pointNo) => ({
    pointNo,
    result: 'ok',
    comment: '',
    ...answers[pointNo]
  }))
  return post(
    '/fleet/road-checklists',
    { tripNo: 'TRP-00008', stage: 'departure', takenAt: '2026-09-04T09:00', results, ...body },
    'MNT001'
  )
}

describe('road checklists', () => {
  it('copy the point labels and flag a blocking anomaly', async () => {
    const response = await reading({
      FRS: { result: 'anomaly', comment: 'Garde au frein trop longue' }
    })
    expect(response.status).toBe(201)
    const checklist = response.data.data as RoadChecklistApi
    expect(checklist).toMatchObject({ anomalyCount: 1, blocking: true, createdBy: 'MNT001' })
    expect(checklist.results.find((point) => point.pointNo === 'FRS')).toMatchObject({
      label: 'Frein de service',
      blocking: true
    })
  })

  it('need every point answered and every anomaly explained', async () => {
    expect((await reading({ KLX: { result: 'anomaly' } })).status).toBe(422)
    const missing = await post(
      '/fleet/road-checklists',
      { tripNo: 'TRP-00008', stage: 'departure', takenAt: '2026-09-04T09:00', results: [] },
      'MNT001'
    )
    expect(missing.status).toBe(422)
    const results = (await vehiclePoints()).map((pointNo) => ({ pointNo, result: 'ok' }))
    const unknown = await post(
      '/fleet/road-checklists',
      {
        tripNo: 'TRP-00008',
        stage: 'departure',
        takenAt: '2026-09-04T09:00',
        results: [...results, { pointNo: 'XYZ', result: 'ok' }]
      },
      'MNT001'
    )
    expect(unknown.status).toBe(400)
  })

  it('are never edited, and not taken on a closed trip or in the future', async () => {
    const edit = await call(server, 'patch', '/fleet/road-checklists/CKL-00001', {
      as: 'FLT001',
      body: { stage: 'arrival' }
    })
    expect(edit.status).toBe(405)
    expect((await reading({}, { tripNo: 'TRP-00002' })).status).toBe(409)
    expect((await reading({}, { takenAt: '2026-09-04T18:00' })).status).toBe(422)
  })
})

describe('inspections', () => {
  it('immobilize a vehicle until it passes its re-inspection', async () => {
    expect(await get<VehicleApi>('/fleet/vehicles/VEH-022')).toMatchObject({
      status: 'immobilized'
    })
    expect(await get<InspectionApi>('/fleet/inspections/INS-00004')).toMatchObject({
      state: 'recheck_pending',
      recheckDueOn: '2026-09-09'
    })
    expect(
      (await post('/fleet/inspections/INS-00004/recheck', { recheckDoneOn: '2026-09-10' })).status
    ).toBe(422)
    const rechecked = await post('/fleet/inspections/INS-00004/recheck', {
      recheckDoneOn: '2026-09-03'
    })
    expect(rechecked.data.data).toMatchObject({ state: 'rechecked' })
    expect((await get<VehicleApi>('/fleet/vehicles/VEH-022')).status).not.toBe('immobilized')
    expect(
      (await post('/fleet/inspections/INS-00004/recheck', { recheckDoneOn: '2026-09-04' })).status
    ).toBe(409)
  })

  it('follow the grid of the vehicle, item by item, and need a signed report', async () => {
    const grid = await inspectionGrid('VEH-013')
    expect(grid.some((item) => item.part === 'tank')).toBe(false)
    expect((await inspectionGrid('VEH-022')).some((item) => item.part === 'tank')).toBe(true)
    const record = (verdicts: Record<string, Verdict>, body: Record<string, unknown> = {}) =>
      post('/fleet/inspections', {
        vehicleNo: 'VEH-013',
        inspectedOn: '2026-09-02',
        center: 'Atelier de Tanjombato',
        items: grid.map((item) => ({
          itemNo: item.itemNo,
          ...(verdicts[item.itemNo] ?? { verdict: 'conforming' })
        })),
        inspector: 'Faly Rasolofo',
        signed: true,
        ...body
      })
    expect((await record({ 'VH-04': { verdict: null } })).status).toBe(422)
    expect((await record({ 'VH-04': { verdict: 'non_conforming' } })).status).toBe(422)
    expect((await record({}, { signed: false })).status).toBe(422)
    expect((await record({}, { inspector: '' })).status).toBe(422)
    expect((await record({}, {})).status).toBe(201)
    expect((await get<VehicleApi>('/fleet/vehicles/VEH-013')).status).not.toBe('immobilized')
    const failed = (
      await record(
        { 'VH-04': { verdict: 'non_conforming', comment: 'Pneu lisse' } },
        {
          inspectedOn: '2026-09-03'
        }
      )
    ).data.data as InspectionApi
    expect(failed).toMatchObject({
      result: 'non_conforming',
      state: 'recheck_pending',
      recheckItemNos: ['VH-04'],
      inspector: 'Faly Rasolofo',
      signedBy: 'FLT001'
    })
    expect(failed.recheckDueOn).not.toBeNull()
    expect((await get<VehicleApi>('/fleet/vehicles/VEH-013')).status).toBe('immobilized')
  })

  it('pass with an observation, which calls for no re-inspection', async () => {
    const grid = await inspectionGrid('VEH-013')
    const response = await post('/fleet/inspections', {
      vehicleNo: 'VEH-013',
      inspectedOn: '2026-09-02',
      center: 'Atelier de Tanjombato',
      items: grid.map((item) =>
        item.itemNo === 'VH-04'
          ? { itemNo: item.itemNo, verdict: 'observation', comment: 'Usure à surveiller' }
          : { itemNo: item.itemNo, verdict: 'conforming' }
      ),
      inspector: 'Faly Rasolofo',
      signed: true
    })
    expect(response.data.data).toMatchObject({ result: 'conforming', recheckDueOn: null })
    expect((await post('/fleet/inspections', { vehicleNo: 'VEH-013' }, 'DIR001')).status).toBe(403)
  })

  it('count a later conforming inspection as the re-inspection', async () => {
    const grid = await inspectionGrid('VEH-022')
    await post('/fleet/inspections', {
      vehicleNo: 'VEH-022',
      inspectedOn: '2026-09-03',
      center: 'Centre de contrôle technique de Tanjombato',
      items: grid.map((item) => ({ itemNo: item.itemNo, verdict: 'conforming' })),
      inspector: 'Faly Rasolofo',
      signed: true
    })
    expect((await get<VehicleApi>('/fleet/vehicles/VEH-022')).status).not.toBe('immobilized')
  })
})
