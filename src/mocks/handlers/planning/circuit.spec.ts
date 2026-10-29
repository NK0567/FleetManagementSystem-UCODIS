import { beforeEach, describe, expect, it } from 'vitest'
import type { DeliveryRequestApi } from '@/modules/planning/delivery-requests/types/deliveryRequest.types'
import type { PlanningSettingsApi } from '@/modules/planning/planning-settings/types/planningSettings.types'
import type { LoadingProposalApi } from '@/modules/planning/transport-orders/types/loadingProposal.types'
import type { TransportOrderApi } from '@/modules/planning/transport-orders/types/transportOrder.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'
import type { AnsweredLineApi, ConfirmationLineApi } from './confirmations'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const send = (method: 'get' | 'post' | 'put' | 'patch', url: string, body = {}, as = 'PLN001') =>
  call(server, method, url, { as, body, language: 'en' })

const requests = '/planning/delivery-requests'
const orders = '/planning/transport-orders'
const order = {
  ordererNo: 'CLI-004',
  deliveryPointNo: 'DP-005',
  desiredDate: '2026-09-09',
  lines: [{ productNo: 'PRD-001', quantity: 10, weightKg: 150 }]
}

function setSettings(section: string, values: Record<string, unknown>) {
  const row = server.db.planningSettings.findOrFail('PLANNING') as unknown as Record<string, object>
  server.db.planningSettings.update('PLANNING', {
    [section]: { ...(row[section] ?? {}), ...values }
  } as never)
}

describe('order circuit settings (TRS07-US05, US06)', () => {
  it('serves the incident lists and keeps a reason code on a known reason type', async () => {
    const read = (await send('get', '/planning/settings', {}, 'ADM001')).data
      .data as PlanningSettingsApi
    expect(read.incidents.incidentTypes.map((item) => item.no)).toEqual(
      expect.arrayContaining(['INC-CANCEL', 'INC-DEVIATION'])
    )
    const lists = {
      ...read.incidents,
      reasonCodes: [{ no: 'MCO-X', name: 'Autre', reasonTypeNo: 'MTY-NONE', active: true }]
    }
    expect((await send('put', '/planning/settings/incidents', lists, 'ADM001')).status).toBe(422)
    expect((await send('put', '/planning/settings/incidents', read.incidents)).status).toBe(403)
    const saved = await send(
      'put',
      '/planning/settings/incidents',
      {
        ...read.incidents,
        incidentTypes: [...read.incidents.incidentTypes, { no: 'inc-panne', name: 'Panne' }]
      },
      'ADM001'
    )
    expect((saved.data.data as PlanningSettingsApi).incidents.incidentTypes.at(-1)).toEqual({
      no: 'INC-PANNE',
      name: 'Panne',
      active: true
    })
  })

  it('lets every user read the circuit, with only the channels offered', async () => {
    setSettings('channels', { whatsapp: false, email: false })
    const circuit = (await send('get', '/planning/settings/circuit', {}, 'COM001')).data.data as {
      channels: string[]
    }
    expect(circuit.channels).toEqual(['none', 'sms', 'call'])
    const refused = await send(
      'post',
      requests,
      { ...order, notificationChannel: 'whatsapp' },
      'COM001'
    )
    expect(refused.status).toBe(422)
  })
})

describe('receiving orders (TRS01-US01, US02, US04)', () => {
  it('closes each way in that the company has not opened', async () => {
    setSettings('intake', { serviceTransmission: false, manualEntry: false, fileImport: false })
    expect((await send('post', requests, order, 'COM001')).status).toBe(403)
    expect((await send('post', requests, order)).status).toBe(403)
    expect((await send('post', `${requests}/import`, { rows: [order] })).status).toBe(403)
  })

  it('receives the orders of the management system once, and those of the API with a known key', async () => {
    const first = await send('post', `${requests}/connector/sync`)
    const received = (first.data.data as { received: string[] }).received
    expect(received).toHaveLength(2)
    expect((await send('post', `${requests}/connector/sync`)).data.data).toEqual({ received: [] })
    const synced = (await send('get', `${requests}/${received[0]}`)).data.data as DeliveryRequestApi
    expect(synced).toMatchObject({ origin: 'connector', pickupPointNo: 'DPT-002', unitCount: 20 })
    const unknown = await call(server, 'post', '/public/orderer-api/orders', {
      body: { ...order, apiKey: 'demo-CLI-001' }
    })
    expect(unknown.status).toBe(403)
    const sent = await call(server, 'post', '/public/orderer-api/orders', {
      body: { ...order, apiKey: 'demo-CLI-002', ordererNo: 'CLI-004' }
    })
    const no = (sent.data.data as { no: string }).no
    expect((await send('get', `${requests}/${no}`)).data.data).toMatchObject({
      origin: 'api',
      ordererNo: 'CLI-002'
    })
    setSettings('intake', { ordererApi: false })
    const closed = await call(server, 'post', '/public/orderer-api/orders', {
      body: { ...order, apiKey: 'demo-CLI-002' }
    })
    expect(closed.status).toBe(403)
  })

  it('asks the weight always, and places sales, transfers and returns', async () => {
    const light = { ...order, lines: [{ productNo: 'PRD-001', quantity: 10 }] }
    expect((await send('post', requests, light, 'COM001')).status).toBe(422)
    const transferToRecipient = { ...order, kind: 'transfer', pickupPointNo: 'DPT-001' }
    expect((await send('post', requests, transferToRecipient, 'COM001')).status).toBe(422)
    const transfer = await send(
      'post',
      requests,
      { ...order, kind: 'transfer', pickupPointNo: 'DPT-001', deliveryPointNo: 'DPT-002' },
      'COM001'
    )
    expect(transfer.status).toBe(201)
    const backFromDepot = {
      ...order,
      kind: 'return',
      pickupPointNo: 'DPT-001',
      deliveryPointNo: 'DPT-002'
    }
    expect((await send('post', requests, backFromDepot, 'COM001')).status).toBe(422)
    const back = await send(
      'post',
      requests,
      {
        ...order,
        kind: 'return',
        pickupPointNo: 'DP-005',
        deliveryPointNo: 'DPT-001',
        content: 'Invendus',
        unitCount: 4,
        requiredEquipmentTypeNo: 'PUMP'
      },
      'COM001'
    )
    expect(back.data.data).toMatchObject({
      kind: 'return',
      pickupPointName: 'Shoprite Antsirabe',
      requiredEquipmentName: 'Pompe de dépotage'
    })
  })
})

describe('composing a transport order (TRS01-US06, US08, US14, US17)', () => {
  it('records an order keyed in the transport order, when the company allows it', async () => {
    const created = (await send('post', orders, { plannedDeparture: '2026-09-12T06:00' })).data
      .data as TransportOrderApi
    const keyed = {
      lines: [
        {
          deliveryPointNo: 'DP-005',
          ordererNo: 'CLI-004',
          productNo: 'PRD-001',
          quantity: 5,
          weightKg: 75,
          volumeM3: 2
        }
      ]
    }
    const saved = (await send('put', `${orders}/${created.no}/lines`, keyed)).data
      .data as TransportOrderApi
    const no = saved.lines[0]!.deliveryRequestNo!
    expect(await (await send('get', `${requests}/${no}`)).data.data).toMatchObject({
      origin: 'planner',
      transportOrderNo: created.no
    })
    expect(saved).toMatchObject({ totalWeightKg: 75, totalVolumeM3: 2 })
    setSettings('intake', { plannerDirectEntry: false })
    expect((await send('put', `${orders}/${created.no}/lines`, keyed)).status).toBe(422)
  })

  it('warns, without blocking, of a reduced quantity on a full delivery and leaves the rest pending', async () => {
    const created = (await send('post', orders, { plannedDeparture: '2026-09-09T06:00' })).data
      .data as TransportOrderApi
    const partial = {
      lines: [{ deliveryRequestNo: 'DL-2026-0012', lineQuantities: { 1: 100 } }]
    }
    const warned = await send('put', `${orders}/${created.no}/lines`, partial)
    expect(warned.status).toBe(409)
    expect(warned.data.message).toContain('reduced quantity')
    expect(
      (
        await send('put', `${orders}/${created.no}/lines`, {
          ...partial,
          lineQuantities: { 1: 500 }
        })
      ).status
    ).toBe(409)
    const saved = (await send('put', `${orders}/${created.no}/lines`, { ...partial, force: true }))
      .data.data as TransportOrderApi
    expect(saved.lines[0]).toMatchObject({ quantity: 100, weightKg: 1500 })
    const rest = server.db.deliveryRequests.all().find((row) => row.parentNo === 'DL-2026-0012')
    expect(rest?.lines).toEqual([
      expect.objectContaining({ productNo: 'PRD-001', quantity: 20, weightKg: 300 })
    ])
  })

  it('compares weight and volume with the trailer and says how to remedy an excess', async () => {
    const created = (
      await send('post', orders, {
        routeTemplateNo: 'TNR-ATS',
        plannedDeparture: '2026-09-12T06:00'
      })
    ).data.data as TransportOrderApi
    await send('put', `${orders}/${created.no}/lines`, {
      lines: [
        {
          deliveryPointNo: 'DP-005',
          ordererNo: 'CLI-004',
          productNo: 'PRD-001',
          quantity: 10,
          weightKg: 1000,
          volumeM3: 500
        }
      ]
    })
    const planned = await send('post', `${orders}/${created.no}/plan`, {
      means: 'fleet',
      vehicleNo: 'VEH-001',
      trailerNo: 'VEH-011',
      driverNo: 'UCT-012'
    })
    expect(planned.status).toBe(409)
    expect(planned.data.message).toContain('useful volume')
    expect(planned.data.message).toContain('choose another vehicle')
  })

  it('refuses a vehicle without the equipment an order asks for', async () => {
    const back = (
      await send(
        'post',
        requests,
        { ...order, desiredDate: '2026-09-12', requiredEquipmentTypeNo: 'PUMP' },
        'COM001'
      )
    ).data.data as DeliveryRequestApi
    const created = (
      await send('post', orders, {
        routeTemplateNo: 'TNR-ATS',
        plannedDeparture: '2026-09-12T06:00',
        deliveryRequestNos: [back.no]
      })
    ).data.data as TransportOrderApi
    const planned = await send('post', `${orders}/${created.no}/plan`, {
      means: 'fleet',
      vehicleNo: 'VEH-001',
      trailerNo: 'VEH-011',
      driverNo: 'UCT-012'
    })
    expect(planned.status).toBe(422)
    expect(planned.data.message).toContain('Pompe')
  })

  it('notifies a recipient added to a planned order', async () => {
    const before = server.db.transportOrders.findOrFail('TR-2026-0002')
    const lines = [
      ...[...new Set(before.lines.map((line) => line.deliveryRequestNo))].map((no) => ({
        deliveryRequestNo: no
      })),
      {
        deliveryPointNo: 'DP-002',
        ordererNo: 'CLI-002',
        productNo: 'PRD-003',
        quantity: 5,
        weightKg: 75
      }
    ]
    const saved = await send('put', `${orders}/TR-2026-0002/lines`, { lines, force: true })
    expect(saved.status).toBe(200)
    const after = server.db.transportOrders.findOrFail('TR-2026-0002')
    const added = after.lines.at(-1)!
    expect(added.trackingToken).toBeTruthy()
    expect(added.recipientMessages?.[0]).toMatchObject({ kind: 'planned' })
    expect(after.events.at(-1)).toMatchObject({ kind: 'recipients_notified' })
  })
})

describe('replanning (TRS01-US16, US17)', () => {
  it('gathers the lines replanned to one day in one pending order, whatever their origin', async () => {
    const markUnavailable = (no: string) =>
      send(
        'post',
        `${orders}/${no}/lines/1/unavailable`,
        { reasonNo: 'UNV-CLOSED', availableOn: '2026-09-20' },
        'CLI001'
      )
    await markUnavailable('TR-2026-0002')
    const first = (await send('post', `${orders}/TR-2026-0002/lines/1/replan`)).data
      .data as TransportOrderApi
    // A second planned order, one of its lines unavailable for the same day.
    const otherCreated = await send('post', orders, {
      routeTemplateNo: 'TNR-ATS',
      plannedDeparture: '2026-09-12T06:00',
      deliveryRequestNos: ['DL-2026-0002']
    })
    const other = otherCreated.data.data as TransportOrderApi
    const plannedOther = await send('post', `${orders}/${other.no}/plan`, {
      means: 'carrier',
      carrierNo: 'PRS-016',
      carrierVehiclePlate: '2345 TBA'
    })
    expect(plannedOther.status).toBe(200)
    await markUnavailable(other.no)
    const second = (await send('post', `${orders}/${other.no}/lines/1/replan`)).data
      .data as TransportOrderApi
    expect(second.no).toBe(first.no)
    expect(second.lines).toHaveLength(2)
    expect(first).toMatchObject({ status: 'draft', replanDate: '2026-09-20' })
    // Nothing to replan twice, and the agent never replans.
    expect((await send('post', `${orders}/TR-2026-0002/lines/1/replan`)).status).toBe(409)
  })
})

describe('loading proposal (TRS01-US09, US10)', () => {
  it('puts the orders of the day on free vehicles, then makes pending orders of it', async () => {
    const proposal = (await send('post', `${orders}/loading-proposal`, { date: '2026-09-08' })).data
      .data as LoadingProposalApi
    const used = proposal.vehicles.find((vehicle) =>
      vehicle.requests.some((item) => item.no === 'DL-2026-0001')
    )
    expect(used).toBeTruthy()
    expect(used!.issues).toEqual([])
    // Cleared to assign by hand: the same rules judge the correction.
    const cleared = (
      await send('post', `${orders}/loading-proposal/evaluate`, {
        date: '2026-09-08',
        assignments: []
      })
    ).data.data as LoadingProposalApi
    expect(cleared.remaining.find((item) => item.productNo === 'PRD-001')?.quantity).toBe(420)
    expect(
      (await send('post', `${orders}/loading-proposal`, { date: '2026-09-08' }, 'LIV001')).status
    ).toBe(403)
    const validated = await send('post', `${orders}/loading-proposal/validate`, {
      date: '2026-09-08',
      assignments: [
        { vehicleNo: used!.vehicleNo, trailerNo: used!.trailerNo, requestNos: ['DL-2026-0001'] }
      ],
      carrierGroups: []
    })
    const [no] = (validated.data.data as { orderNos: string[] }).orderNos
    expect((await send('get', `${orders}/${no}`)).data.data).toMatchObject({
      status: 'draft',
      proposedVehicleNo: used!.vehicleNo
    })
    expect(
      (
        await send('post', `${orders}/loading-proposal/validate`, {
          date: '2026-09-08',
          assignments: [{ vehicleNo: used!.vehicleNo, requestNos: ['DL-2026-0001'] }]
        })
      ).status
    ).toBe(409)
  })
})

describe('trip plan and expired orders (TRS01-US11, TRS07-US07)', () => {
  it('validates the corridor, and changes the route on the road only with a reason', async () => {
    const validated = (
      await send('post', `${orders}/TR-2026-0002/route-plan/validate`, { corridorKm: 3 })
    ).data.data as TransportOrderApi
    expect(validated.routePlan).toMatchObject({ corridorKm: 3 })
    expect(validated.routePlan?.validatedAt).toBeTruthy()
    expect(
      (
        await send('post', `${orders}/TR-2026-0002/route-change`, {
          routeTemplateNo: 'TNR-TOA',
          reason: 'Route coupée'
        })
      ).status
    ).toBe(409)
  })

  it('blocks the loading of an order past its date when the company says so, until rescheduled', async () => {
    setSettings('requests', { expiredDateMode: 'block' })
    const confirmed = server.db.transportOrders.all().find((row) => row.no === 'TR-2026-0002')!
    server.db.transportOrders.update(confirmed.no, {
      lines: confirmed.lines.map((line) => ({ ...line, confirmedAt: '2026-09-01T08:00:00' }))
    })
    server.db.trips.update(confirmed.tripNo!, { plannedDeparture: '2026-09-02T06:00:00' })
    const listed = (await send('get', `${orders}/TR-2026-0002`)).data.data as TransportOrderApi
    expect(listed.expired).toBe(true)
    const lines = listed.lines.map((line) => ({
      lineNo: line.lineNo,
      loadedQuantity: line.quantity
    }))
    expect((await send('put', `${orders}/TR-2026-0002/loading`, { lines }, 'LIV001')).status).toBe(
      409
    )
    await send('post', `${orders}/TR-2026-0002/reschedule`, {
      plannedDeparture: '2026-09-06T06:00'
    })
    expect((await send('put', `${orders}/TR-2026-0002/loading`, { lines }, 'LIV001')).status).toBe(
      200
    )
  })
})

describe('confirmation queue (TRS01-US15)', () => {
  it('asks a call of the recipients on the phone and keeps the answers given', async () => {
    const queue = (await send('get', '/planning/confirmations', {}, 'CLI001')).data
      .data as ConfirmationLineApi[]
    expect(
      queue.every(
        (line) =>
          line.state !== 'pending' || line.activity !== null || line.notificationChannel === 'none'
      )
    ).toBe(true)
    await send('post', `${orders}/TR-2026-0002/lines/1/confirm`, {}, 'CLI001')
    const answered = (await send('get', '/planning/confirmations/answered', {}, 'CLI001')).data
      .data as AnsweredLineApi[]
    expect(answered[0]).toMatchObject({
      orderNo: 'TR-2026-0002',
      answer: 'confirmed',
      origin: 'call'
    })
    expect((await send('get', '/planning/confirmations/answered')).status).toBe(403)
  })
})

describe('reference data (TRS06-US04, TRS07-US02)', () => {
  it('measures a fuel at 15 °C and refuses those measures on another product', async () => {
    const product = {
      name: 'Riz',
      family: 'Alimentaire',
      unit: 'Sac',
      loadingMeasures: ['quantity', 'volume15']
    }
    expect((await send('post', '/planning/products', product, 'LIV001')).status).toBe(422)
    const created = await send(
      'post',
      '/planning/products',
      { ...product, loadingMeasures: ['quantity', 'weight'], unitWeightKg: 50 },
      'LIV001'
    )
    expect(created.data.data).toMatchObject({
      loadingMeasures: ['quantity', 'weight'],
      deliveryMeasures: ['quantity']
    })
    const fuel = (await send('get', '/planning/products/PRD-006', {}, 'LIV001')).data.data as {
      deliveryMeasures: string[]
    }
    expect(fuel.deliveryMeasures).toContain('volume15')
  })

  it('takes a depot from the site register and ties users to depots and regions', async () => {
    const depot = await send(
      'post',
      '/planning/delivery-points',
      { name: 'Dépôt', kind: 'depot', siteNo: 'DEP-ALR' },
      'ADM001'
    )
    expect(depot.data.data).toMatchObject({
      customerNo: '',
      latitude: -18.8735,
      ownerName: "Société de stockage d'Alarobia"
    })
    expect(
      (
        await send(
          'put',
          '/planning/perimeters/PLN001',
          { depotNos: ['DEP-TNJ'], regions: [] },
          'LIV001'
        )
      ).status
    ).toBe(403)
    expect(
      (
        await send(
          'put',
          '/planning/perimeters/PLN001',
          { depotNos: ['NOPE'], regions: [] },
          'ADM001'
        )
      ).status
    ).toBe(422)
    const all = ((await send('get', orders)).data.data as { items: TransportOrderApi[] }).items
      .length
    await send('put', '/planning/perimeters/PLN001', { depotNos: [], regions: ['Boeny'] }, 'ADM001')
    const mine = ((await send('get', orders)).data.data as { items: TransportOrderApi[] }).items
      .length
    expect(mine).toBeLessThan(all)
  })
})
