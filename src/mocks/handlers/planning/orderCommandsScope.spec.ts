import { beforeEach, describe, expect, it } from 'vitest'
import type { TransportOrderApi } from '@/modules/planning/transport-orders/types/transportOrder.types'
import type { LoadingListApi } from '@/modules/planning/loading/types/pickup.types'
import type { PreparationOptionsApi } from '@/modules/planning/loading-preparations/types/loadingPreparation.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const path = '/planning/transport-orders'
const send = (
  method: 'post' | 'patch' | 'put',
  url: string,
  body: Record<string, unknown> = {},
  as = 'PLN001'
) => call(server, method, url, { as, body, language: 'en' })
const getOrder = async (no: string) =>
  (await call(server, 'get', `${path}/${no}`, { as: 'PLN001' })).data.data as TransportOrderApi

async function draftWith(requestNo: string) {
  const created = await send('post', path, {
    routeTemplateNo: 'TNR-ATS',
    plannedDeparture: '2026-09-12T06:00',
    deliveryRequestNos: [requestNo]
  })
  return created.data.data as TransportOrderApi
}

function setSettings(section: string, values: Record<string, unknown>) {
  const row = server.db.planningSettings.findOrFail('PLANNING') as unknown as Record<string, object>
  server.db.planningSettings.update('PLANNING', {
    [section]: { ...(row[section] ?? {}), ...values }
  } as never)
}

describe('a carrier vehicle is compared with the load (TRS01-US08, US09)', () => {
  it('warns of an overload on the carrier vehicle, and goes on when the planner accepts', async () => {
    const order = await draftWith('DL-2026-0001')
    // Make the load heavier than the 19 t porteur of the carrier.
    server.db.transportOrders.update(order.no, {
      lines: server.db.transportOrders
        .findOrFail(order.no)
        .lines.map((line) => ({ ...line, weightKg: 20250 }))
    })
    const body = { means: 'carrier', carrierNo: 'PRS-016', carrierVehiclePlate: '2378 TBA' }
    const warned = await send('post', `${path}/${order.no}/plan`, body)
    expect(warned.status).toBe(409)
    expect(JSON.stringify(warned.data)).toContain('19000')
    const accepted = await send('post', `${path}/${order.no}/plan`, { ...body, force: true })
    expect(accepted.status).toBe(200)
    const planned = await getOrder(order.no)
    expect(planned.capacity).toMatchObject({ maxLoadKg: 19000, maxVolumeM3: 45 })
    expect(planned.fill.weightPercent).toBeGreaterThan(100)
  })

  it('refuses the overload when the capacity check is strict', async () => {
    setSettings('controls', { strictCapacity: true })
    const order = await draftWith('DL-2026-0001')
    server.db.transportOrders.update(order.no, {
      lines: server.db.transportOrders
        .findOrFail(order.no)
        .lines.map((line) => ({ ...line, weightKg: 20250 }))
    })
    const refused = await send('post', `${path}/${order.no}/plan`, {
      means: 'carrier',
      carrierNo: 'PRS-016',
      carrierVehiclePlate: '2378 TBA',
      force: true
    })
    expect(refused.status).toBe(422)
  })

  it('compares nothing when the carrier record states no capacity', async () => {
    const order = await draftWith('DL-2026-0001')
    server.db.providers.update('PRS-016', {
      carrierVehicles: [{ plate: '2378 TBA', description: 'Porteur' }]
    })
    const planned = await send('post', `${path}/${order.no}/plan`, {
      means: 'carrier',
      carrierNo: 'PRS-016',
      carrierVehiclePlate: '2378 TBA'
    })
    expect(planned.status).toBe(200)
    expect((await getOrder(order.no)).capacity).toBeNull()
  })
})

describe('a line keyed in the order carries the orderer reference (TRS01-US06 CA04)', () => {
  it('asks for the reference when the company requires it, and keeps it', async () => {
    setSettings('requests', { externalReferenceRequired: true })
    const order = await draftWith('DL-2026-0001')
    const line = {
      deliveryPointNo: 'DP-001',
      productNo: 'PRD-002',
      quantity: 10,
      weightKg: 100,
      ordererNo: 'CLI-010'
    }
    const kept = server.db.transportOrders.findOrFail(order.no).lines
    const refused = await send('put', `${path}/${order.no}/lines`, {
      lines: [...kept.map((item) => ({ deliveryRequestNo: item.deliveryRequestNo })), line]
    })
    expect(refused.status).toBe(422)
    expect(JSON.stringify(refused.data)).toContain('reference')
    const accepted = await send('put', `${path}/${order.no}/lines`, {
      lines: [
        ...kept.map((item) => ({ deliveryRequestNo: item.deliveryRequestNo })),
        { ...line, externalReference: 'CC-9001' }
      ]
    })
    expect(accepted.status).toBe(200)
    const lines = (await getOrder(order.no)).lines
    expect(lines.some((item) => item.externalReference === 'CC-9001')).toBe(true)
  })
})

describe('the loading preparation offers only vehicles that can go out', () => {
  it('leaves out the immobilized vehicles, and brings the trailer and driver with a tractor', async () => {
    const options = (
      await call(server, 'get', '/planning/loading-preparations/options', { as: 'LIV001' })
    ).data.data as PreparationOptionsApi
    const plates = options.vehicles.map((vehicle) => vehicle.plate)
    expect(plates).not.toContain('CT 4202')
    const tractors = options.vehicles.filter((vehicle) => vehicle.motorized)
    expect(tractors.length).toBeGreaterThan(0)
    expect(options.vehicles.every((vehicle) => 'coupledTrailerNo' in vehicle)).toBe(true)
    const coupled = tractors.find((vehicle) => vehicle.coupledTrailerNo)
    expect(coupled?.coupledTrailerNo).toBeTruthy()
  })

  it('refuses an immobilized vehicle when the preparation is saved', async () => {
    const refused = await send(
      'post',
      '/planning/loading-preparations',
      {
        depotSiteNo: 'DEP-ALR',
        loadingDate: '2026-09-06',
        validUntil: '2026-09-07',
        region: 'Analamanga',
        requestNos: ['DL-2026-0004'],
        vehicles: [{ vehicleNo: 'VEH-004', trailerNo: 'VEH-022', driverNo: null }]
      },
      'LIV001'
    )
    expect(refused.status).toBe(422)
    expect(JSON.stringify(refused.data)).toContain('immobilized')
  })
})

describe('the loading list shows what each order contains (TRS01-US06 CA06)', () => {
  it('carries the content of the order on each line', async () => {
    const list = (await call(server, 'get', `${path}/TR-2026-0002/loading-list`, { as: 'PLN001' }))
      .data.data as LoadingListApi
    const lines = list.groups.flatMap((group) => group.lines)
    expect(lines.length).toBeGreaterThan(0)
    expect(lines.every((line) => typeof line.content === 'string')).toBe(true)
  })
})

describe('the agreement to a partial delivery is traced (TRS01-US17 CA05)', () => {
  it('records who agreed, only for an order that asks for a complete delivery', async () => {
    const order = await draftWith('DL-2026-0001')
    const lineNo = order.lines[0]!.lineNo
    const url = `${path}/${order.no}/lines/${lineNo}/partial-agreement`
    expect((await send('post', url, { by: 'M. Rabe' })).status).toBe(409)
    server.db.deliveryRequests.update('DL-2026-0001', { fullDeliveryRequired: true })
    expect((await send('post', url, { by: '' })).status).toBe(422)
    expect((await send('post', url, { by: 'M. Rabe' }, 'DIR001')).status).toBe(403)
    expect((await send('post', url, { by: 'M. Rabe', note: 'Au téléphone' })).status).toBe(200)
    const line = (await getOrder(order.no)).lines[0]!
    expect(line.fullDeliveryRequired).toBe(true)
    expect(line.partialAgreement).toMatchObject({ by: 'M. Rabe', recordedBy: 'PLN001' })
    expect((await getOrder(order.no)).events.some((e) => e.kind === 'partial_agreement')).toBe(true)
  })
})

describe('a code in the history reads as its name', () => {
  it('shows the reason of a cancellation by its name', async () => {
    const order = await draftWith('DL-2026-0001')
    await send('post', `${path}/${order.no}/cancel`, { reasonNo: 'CXL-CUSTOMER' })
    const events = (await getOrder(order.no)).events
    const cancelled = events.find((event) => event.kind === 'cancelled')
    expect(cancelled?.detail).not.toBe('CXL-CUSTOMER')
    expect(cancelled?.detail.length).toBeGreaterThan(3)
  })
})

describe('the loading proposal also uses the tankers that are not coupled (TRS01-US10 CA04)', () => {
  it('puts a free tanker behind a free tractor, with its compartments', async () => {
    const proposal = (
      await send('post', '/planning/transport-orders/loading-proposal', {
        date: '2026-09-06'
      })
    ).data.data as {
      vehicles: { plate: string; trailerPlate: string; compartments: unknown[] }[]
    }
    const tankers = proposal.vehicles.filter((vehicle) => vehicle.trailerPlate.startsWith('CT'))
    expect(tankers.length).toBeGreaterThan(0)
    expect(tankers.some((vehicle) => vehicle.compartments.length > 0)).toBe(true)
  })
})

describe('an order with nothing to confirm goes straight to confirmed (TRS01-US12 CA05, US13 CA06)', () => {
  it('confirms at once the lines that do not ask for a confirmation, and the order when none does', async () => {
    const order = await draftWith('DL-2026-0001')
    server.db.deliveryRequests.update('DL-2026-0001', { confirmationRequired: false })
    const planned = await send('post', `${path}/${order.no}/plan`, {
      means: 'fleet',
      vehicleNo: 'VEH-001',
      trailerNo: 'VEH-011',
      driverNo: 'UCT-010',
      force: true
    })
    expect(planned.status).toBe(200)
    const read = await getOrder(order.no)
    expect(read.lines.every((line) => line.confirmedAt)).toBe(true)
    expect(read.status).toBe('confirmed')
  })

  it('leaves the order planned while one recipient has to answer', async () => {
    const order = await draftWith('DL-2026-0001')
    server.db.deliveryRequests.update('DL-2026-0001', { confirmationRequired: true })
    await send('post', `${path}/${order.no}/plan`, {
      means: 'fleet',
      vehicleNo: 'VEH-001',
      trailerNo: 'VEH-011',
      driverNo: 'UCT-010',
      force: true
    })
    expect((await getOrder(order.no)).status).toBe('planned')
  })
})

describe('the preferences of an order are frozen once it is planned (TRS01-US13 CA04)', () => {
  it('refuses to change the channel of an order already planned', async () => {
    const order = await draftWith('DL-2026-0001')
    await send('post', `${path}/${order.no}/plan`, {
      means: 'fleet',
      vehicleNo: 'VEH-001',
      trailerNo: 'VEH-011',
      driverNo: 'UCT-010',
      force: true
    })
    const changed = await send('patch', '/planning/delivery-requests/DL-2026-0001', {
      notificationChannel: 'sms'
    })
    expect(changed.status).toBe(409)
  })
})
