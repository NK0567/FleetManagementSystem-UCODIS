import { beforeEach, describe, expect, it } from 'vitest'
import type { VehicleApi } from '@/modules/fleet/vehicles/types/vehicle.types'
import type { DowntimeApi } from '@/modules/maintenance/downtimes/types/downtime.types'
import type { WorkOrderApi } from '@/modules/maintenance/work-orders/types/workOrder.types'
import { addDays } from '@/utils/date'
import { DEMO_REFERENCE_DATE } from '../../clock'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const send = (path: string, body: Record<string, unknown> = {}, as = 'FLT001') =>
  call(server, 'post', `/maintenance/work-orders${path}`, { as, body, language: 'en' })

async function get<T>(path: string) {
  return (await call(server, 'get', path, { as: 'FLT001', language: 'en' })).data.data as T
}

const order = (no: string) => get<WorkOrderApi>(`/maintenance/work-orders/${no}`)
const vehicle = (no: string) => get<VehicleApi>(`/fleet/vehicles/${no}`)

const declare = (body: Record<string, unknown> = {}, as = 'FLT001') =>
  send(
    '',
    {
      vehicleNo: 'VEH-003',
      maintenanceType: 'corrective',
      severity: 'minor',
      origin: 'workshop_finding',
      symptom: 'Témoin moteur allumé au ralenti.',
      declaredAt: `${DEMO_REFERENCE_DATE}T08:00`,
      ...body
    },
    as
  )

const diagnosis = { subsystemNo: 'ENGINE', modeNo: 'POWER-LOSS', causeNo: 'POOR-MAINTENANCE' }

describe('work orders', () => {
  it('seed diagnoses with codes of the right kind', () => {
    const kinds = new Map(server.db.failureCodes.all().map((code) => [code.no, code.kind]))
    for (const row of server.db.workOrders.all()) {
      if (!row.diagnosis) continue
      expect(kinds.get(row.diagnosis.subsystemNo)).toBe('subsystem')
      if (row.diagnosis.modeNo) expect(kinds.get(row.diagnosis.modeNo)).toBe('mode')
      if (row.diagnosis.causeNo) expect(kinds.get(row.diagnosis.causeNo)).toBe('cause')
    }
  })

  it('derive the status, the hours and their cost', async () => {
    expect(await order('OT-2026-0004')).toMatchObject({
      status: 'awaiting_validation',
      vehiclePlate: '4028 TBA',
      subsystemName: 'Électricité et électronique',
      labourHours: 5,
      labourCost: 50_000,
      totalCost: 50_000
    })
    expect((await order('OT-2026-0003')).status).toBe('diagnosed')
    expect((await order('OT-2026-0001')).status).toBe('closed')
  })

  it('take faults by hand only from a driver or the workshop', async () => {
    expect((await declare({ origin: 'telematics' })).status).toBe(422)
    expect((await declare({ symptom: 'Bruit' })).status).toBe(422)
    expect((await declare({}, 'DIR001')).status).toBe(403)
    const created = (await declare({}, 'MNT001')).data.data as WorkOrderApi
    expect(created).toMatchObject({
      no: 'OT-2026-0005',
      status: 'open',
      declaredBy: 'MNT001',
      odometerKmAtOpening: 201_300,
      downtimeNo: null
    })
  })

  it('stop the vehicle at once for a major fault, and when the severity rises', async () => {
    const major = (await declare({ severity: 'major' })).data.data as WorkOrderApi
    expect(major.downtimeNo).not.toBeNull()
    expect((await vehicle('VEH-003')).status).toBe('immobilized')
    expect((await get<DowntimeApi>(`/maintenance/downtimes/${major.downtimeNo}`)).origin).toBe(
      'work_order'
    )

    const minor = (await declare({ vehicleNo: 'VEH-002' })).data.data as WorkOrderApi
    expect(minor.downtimeNo).toBeNull()
    const raised = await call(server, 'patch', `/maintenance/work-orders/${minor.no}`, {
      as: 'FLT001',
      body: { severity: 'critical' }
    })
    expect((raised.data.data as WorkOrderApi).downtimeNo).not.toBeNull()
  })

  it('carry a minor fault from diagnosis to validation', async () => {
    const { no } = (await declare()).data.data as WorkOrderApi
    expect((await send(`/${no}/complete`, { workDone: 'Rien.', odometerKm: 201_300 })).status).toBe(
      422
    )
    expect((await send(`/${no}/diagnose`, { ...diagnosis, subsystemNo: 'LEAK' })).status).toBe(422)
    expect((await send(`/${no}/diagnose`, { ...diagnosis, causeNo: null })).status).toBe(422)
    expect((await send(`/${no}/diagnose`, diagnosis, 'MNT001')).data.data).toMatchObject({
      status: 'diagnosed',
      modeName: 'Perte de puissance'
    })

    const log = (body: Record<string, unknown>) =>
      send(
        `/${no}/labour`,
        { technicianNo: 'UCT-008', date: DEMO_REFERENCE_DATE, ...body },
        'MNT001'
      )
    expect((await log({ date: addDays(DEMO_REFERENCE_DATE, 1) })).status).toBe(422)
    expect((await log({ hours: 13 })).status).toBe(400)
    const logged = (await log({ hours: 4 })).data.data as WorkOrderApi
    expect(logged).toMatchObject({ status: 'in_progress', labourHours: 4 })
    expect(logged.downtimeNo).not.toBeNull()
    expect((await vehicle('VEH-003')).status).toBe('immobilized')
    expect((await log({ hours: 9 })).status).toBe(422)
    expect(
      (
        await call(server, 'patch', `/maintenance/work-orders/${no}`, {
          as: 'FLT001',
          body: { symptom: 'Un autre symptôme constaté.' }
        })
      ).status
    ).toBe(409)

    const complete = (body: Record<string, unknown>) =>
      send(
        `/${no}/complete`,
        { workDone: 'Capteur remplacé.', odometerKm: 201_350, ...body },
        'MNT001'
      )
    expect((await complete({ workDone: 'Fait.' })).status).toBe(422)
    expect((await complete({ odometerKm: 200_000 })).status).toBe(422)
    expect((await complete({})).data.data).toMatchObject({ status: 'awaiting_validation' })
    expect((await vehicle('VEH-003')).odometerKm).toBe(201_350)
    expect((await send(`/${no}/labour`, { technicianNo: 'UCT-003', hours: 1 })).status).toBe(409)

    expect((await send(`/${no}/validate`, {}, 'MNT001')).status).toBe(403)
    expect((await send(`/${no}/validate`)).data.data).toMatchObject({
      status: 'closed',
      validatedBy: 'FLT001'
    })
    expect((await get<DowntimeApi>(`/maintenance/downtimes/${logged.downtimeNo}`)).status).toBe(
      'closed'
    )
    expect((await vehicle('VEH-003')).status).not.toBe('immobilized')
    expect((await send(`/${no}/validate`)).status).toBe(409)
  })

  it('keep four eyes on the validation', async () => {
    const { no } = (await declare()).data.data as WorkOrderApi
    await send(`/${no}/diagnose`, diagnosis)
    await send(`/${no}/labour`, { technicianNo: 'UCT-008', date: DEMO_REFERENCE_DATE, hours: 2 })
    await send(`/${no}/complete`, { workDone: 'Capteur remplacé.', odometerKm: 201_300 }, 'MNT001')
    expect((await send(`/${no}/validate`)).status).toBe(403)
    expect((await send(`/${no}/validate`, {}, 'ADM001')).data.data).toMatchObject({
      status: 'closed'
    })
  })

  it('send a finish back with a reason, then cancel and free the vehicle', async () => {
    expect((await send('/OT-2026-0004/refuse', { reason: 'Non' })).status).toBe(422)
    expect(
      (await send('/OT-2026-0004/refuse', { reason: 'Le démarreur claque encore à froid.' })).data
        .data
    ).toMatchObject({ status: 'in_progress', completedBy: null })
    expect((await send('/OT-2026-0004/validate')).status).toBe(409)

    expect((await send('/OT-2026-0004/cancel', { reason: 'Court' })).status).toBe(422)
    expect(
      (await send('/OT-2026-0004/cancel', { reason: 'Véhicule confié au concessionnaire.' })).data
        .data
    ).toMatchObject({ status: 'cancelled' })
    expect((await get<DowntimeApi>('/maintenance/downtimes/IND-00004')).status).toBe('closed')
    expect((await vehicle('VEH-008')).status).toBe('assigned')
    expect((await send('/OT-2026-0004/cancel', { reason: 'Une seconde fois.' })).status).toBe(409)
  })
})
