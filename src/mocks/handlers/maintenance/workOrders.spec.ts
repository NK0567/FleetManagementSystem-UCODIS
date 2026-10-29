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
      labourCost: 60_000,
      totalCost: 60_000
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
      no: 'OT-2026-0007',
      status: 'open',
      declaredBy: 'MNT001',
      odometerKmAtOpening: 201_300
    })
    expect(created.downtimeNo).not.toBeNull()
  })

  it('put the vehicle in maintenance as soon as a repair order opens, under its cause code', async () => {
    const minor = (await declare()).data.data as WorkOrderApi
    expect(minor.downtimeNo).not.toBeNull()
    expect(await vehicle('VEH-003')).toMatchObject({
      status: 'in_maintenance',
      statusReason: expect.stringContaining('Panne')
    })
    const downtime = await get<DowntimeApi>(`/maintenance/downtimes/${minor.downtimeNo}`)
    expect(downtime).toMatchObject({ origin: 'work_order', downtimeCodeNo: 'PNN' })
    expect(downtime.startedAt).toBe(minor.declaredAt)
  })

  it('wait for a part bought for the order, the vehicle staying unavailable', async () => {
    const { no } = (await declare()).data.data as WorkOrderApi
    const bought = await call(server, 'post', '/maintenance/purchase-requests', {
      as: 'MNT001',
      body: { workOrderNo: no, label: 'Sonde de température moteur', quantity: 1 }
    })
    expect(bought.data.data).toMatchObject({ erpReference: expect.stringContaining('ERP-') })
    expect((await order(no)).status).toBe('awaiting_parts')
    const listed = await call(server, 'get', '/maintenance/work-orders', {
      as: 'FLT001',
      query: {
        pageSize: 100,
        filters: JSON.stringify([
          { field: 'status', valueType: 'string', value: ['awaiting_parts'] }
        ])
      }
    })
    expect((listed.data.data as { items: WorkOrderApi[] }).items.map((item) => item.no)).toContain(
      no
    )
    expect((await vehicle('VEH-003')).status).toBe('in_maintenance')
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
    expect((await vehicle('VEH-003')).status).toBe('in_maintenance')
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
    expect((await vehicle('VEH-003')).status).not.toBe('in_maintenance')
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
    // OT-2026-0003, still open on the same vehicle, keeps it in maintenance.
    expect((await get<DowntimeApi>('/maintenance/downtimes/IND-00006')).status).not.toBe('closed')
    expect((await vehicle('VEH-008')).status).toBe('in_maintenance')
    expect((await send('/OT-2026-0004/cancel', { reason: 'Une seconde fois.' })).status).toBe(409)
  })
})

describe('external workshop', () => {
  const handOver = (no: string, body: Record<string, unknown> = {}, as = 'MNT001') =>
    send(
      `/${no}/hand-over`,
      {
        providerNo: 'PRS-002',
        handedOverAt: `${DEMO_REFERENCE_DATE}T08:00`,
        expectedReturnOn: addDays(DEMO_REFERENCE_DATE, 5),
        quoteAmount: 1_200_000,
        ...body
      },
      as
    )

  it('cost the closed seed job from the final invoice', async () => {
    expect(await order('OT-2026-0005')).toMatchObject({
      status: 'closed',
      providerName: 'Atelier Diesel Tanjombato',
      labourCost: 20_000,
      subcontractingCost: 4_800_000,
      totalCost: 4_820_000
    })
  })

  it('hand over only to an authorized garage, and only once', async () => {
    const { no } = (await declare()).data.data as WorkOrderApi
    expect((await handOver(no, { providerNo: 'PRS-003' })).status).toBe(422)
    expect((await handOver(no, { providerNo: 'PRS-006' })).status).toBe(422)
    expect((await handOver(no, { handedOverAt: '2026-01-01T08:00' })).status).toBe(422)
    expect((await handOver(no, { expectedReturnOn: '2026-01-01' })).status).toBe(422)
    expect((await handOver(no, {}, 'DIR001')).status).toBe(403)
    const handed = (await handOver(no)).data.data as WorkOrderApi
    expect(handed).toMatchObject({
      status: 'in_progress',
      providerName: 'Atelier Diesel Tanjombato',
      subcontractingCost: 1_200_000
    })
    expect(handed.downtimeNo).not.toBeNull()
    expect((await vehicle('VEH-003')).status).toBe('in_maintenance')
    expect((await handOver(no)).status).toBe(409)
    expect(
      (await send(`/${no}/labour`, { technicianNo: 'UCT-008', hours: 1 }, 'MNT001')).status
    ).toBe(409)
    expect(
      (await send(`/${no}/complete`, { workDone: 'Fait au garage.', odometerKm: 201_300 })).status
    ).toBe(409)
  })

  it('keep the vehicle out until the closing is validated, even back from the garage', async () => {
    const { no } = (await declare()).data.data as WorkOrderApi
    await send(`/${no}/diagnose`, diagnosis)
    await handOver(no)
    expect(
      (
        await send(`/${no}/external-progress`, {
          progress: 'Pièce commandée.',
          quoteAmount: 1_500_000
        })
      ).data.data
    ).toMatchObject({ subcontractingCost: 1_500_000 })

    const back = (body: Record<string, unknown>) =>
      send(
        `/${no}/return`,
        {
          returnedAt: `${DEMO_REFERENCE_DATE}T09:30`,
          workDone: 'Injecteur remplacé par le garage.',
          odometerKm: 201_310,
          finalAmount: 1_450_000,
          ...body
        },
        'MNT001'
      )
    expect((await back({ returnedAt: `${DEMO_REFERENCE_DATE}T07:00` })).status).toBe(422)
    const returned = (await back({})).data.data as WorkOrderApi
    expect(returned).toMatchObject({ status: 'awaiting_validation', subcontractingCost: 1_450_000 })
    expect(
      (await get<DowntimeApi>(`/maintenance/downtimes/${returned.downtimeNo}`)).status
    ).not.toBe('closed')
    expect((await vehicle('VEH-003')).status).toBe('in_maintenance')
    expect((await send(`/${no}/external-progress`, { progress: 'Encore ?' })).status).toBe(409)

    const refused = (
      await send(`/${no}/refuse`, { reason: 'Le moteur fume toujours au démarrage.' })
    ).data.data as WorkOrderApi
    expect(refused).toMatchObject({ status: 'in_progress' })
    expect(refused.external?.returnedAt).toBeNull()
    expect(refused.downtimeNo).toBe(returned.downtimeNo)
    expect((await vehicle('VEH-003')).status).toBe('in_maintenance')

    await back({ returnedAt: undefined })
    expect((await send(`/${no}/validate`)).data.data).toMatchObject({ status: 'closed' })
    expect((await get<DowntimeApi>(`/maintenance/downtimes/${returned.downtimeNo}`)).status).toBe(
      'closed'
    )
    expect((await vehicle('VEH-003')).status).not.toBe('in_maintenance')
  })
})

describe('driver space', () => {
  it('let the driver report a breakdown of his own vehicle only', async () => {
    const report = (body: Record<string, unknown>, as = 'CND002') =>
      call(server, 'post', '/me/breakdowns', { as, body, language: 'en' })
    expect((await report({ severity: 'major', symptom: 'Bruit' })).status).toBe(422)
    expect(
      (await report({ severity: 'major', symptom: 'Fuite d’huile sous le moteur.' }, 'FLT001'))
        .status
    ).toBe(403)
    const reported = (await report({ severity: 'major', symptom: 'Fuite d’huile sous le moteur.' }))
      .data.data as WorkOrderApi
    expect(reported).toMatchObject({ vehiclePlate: '4022 TBA', status: 'open' })
    expect(await order(reported.no)).toMatchObject({
      origin: 'driver_report',
      maintenanceType: 'corrective',
      declaredBy: 'CND002'
    })
    const mine = await call(server, 'get', '/me/breakdowns', { as: 'CND002' })
    expect((mine.data.data as { no: string }[]).map((row) => row.no)).toContain(reported.no)
  })
})
