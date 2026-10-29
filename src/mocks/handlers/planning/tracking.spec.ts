import { beforeEach, describe, expect, it } from 'vitest'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'
import type { TrackingApi } from './tracking'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

/** The first line of a planned order that sent its link. */
function tokenOf(): string {
  for (const order of server.db.transportOrders.all()) {
    const line = order.lines.find((item) => item.trackingToken && !item.confirmedAt)
    if (line && order.no === 'TR-2026-0002') return line.trackingToken!
  }
  throw new Error('no token')
}

describe('recipient tracking link', () => {
  it('opens without an account and confirms the delivery', async () => {
    const token = tokenOf()
    const shown = await call(server, 'get', `/public/tracking/${token}`, { language: 'en' })
    expect(shown.status).toBe(200)
    expect(shown.data.data).toMatchObject({ orderNo: 'TR-2026-0002', state: 'pending', open: true })
    const confirmed = await call(server, 'post', `/public/tracking/${token}/confirm`, {
      language: 'en'
    })
    expect((confirmed.data.data as TrackingApi).state).toBe('confirmed')
    const queue = await call(server, 'get', '/planning/confirmations', { as: 'CLI001' })
    const line = (queue.data.data as { orderNo: string; byLink: boolean; state: string }[]).find(
      (item) => item.orderNo === 'TR-2026-0002'
    )
    expect(line).toMatchObject({ state: 'confirmed', byLink: true })
  })

  it('takes another date, the next day by default, never one before the planned date', async () => {
    const token = tokenOf()
    const shown = (await call(server, 'get', `/public/tracking/${token}`, {})).data
      .data as TrackingApi
    const reasonNo = shown.reasons[0]!.no
    // A reason is required, as on the phone.
    const noReason = await call(server, 'post', `/public/tracking/${token}/unavailable`, {
      body: {}
    })
    expect(noReason.status).toBe(400)
    const early = await call(server, 'post', `/public/tracking/${token}/unavailable`, {
      body: { date: shown.plannedDeparture!.slice(0, 10), reasonNo },
      language: 'en'
    })
    expect(early.status).toBe(422)
    const later = await call(server, 'post', `/public/tracking/${token}/unavailable`, {
      body: { reasonNo }
    })
    expect(later.data.data).toMatchObject({ state: 'unavailable', availableOn: shown.proposedDate })
    const queue = (await call(server, 'get', '/planning/confirmations', { as: 'CLI001' })).data
      .data as { orderNo: string; byLink: boolean }[]
    expect(queue.find((item) => item.orderNo === 'TR-2026-0002')?.byLink).toBe(true)
  })

  it('lets the recipient accept a date proposed by the planner', async () => {
    const token = tokenOf()
    await call(server, 'post', '/planning/transport-orders/TR-2026-0002/lines/1/propose-date', {
      as: 'CLI001',
      body: { date: '2026-12-15' }
    })
    const shown = (await call(server, 'get', `/public/tracking/${token}`, {})).data
      .data as TrackingApi
    expect(shown.plannerProposedOn).toBe('2026-12-15')
    const accepted = await call(server, 'post', `/public/tracking/${token}/accept-proposal`, {})
    expect(accepted.data.data).toMatchObject({ availableOn: '2026-12-15' })
  })

  it('refuses an unknown link', async () => {
    expect((await call(server, 'get', '/public/tracking/inconnu', {})).status).toBe(404)
  })

  it('shows the progress and lets the recipient confirm or contest after the declaration', async () => {
    const token = tokenOf()
    const order = server.db.transportOrders.find('TR-2026-0002')!
    const lineOf = () =>
      server.db.transportOrders.find('TR-2026-0002')!.lines.find((l) => l.trackingToken === token)!
    const patch = (fields: Record<string, unknown>) =>
      server.db.transportOrders.update('TR-2026-0002', {
        lines: server.db.transportOrders
          .find('TR-2026-0002')!
          .lines.map((l) => (l.trackingToken === token ? { ...l, ...fields } : l))
      })
    expect(order).toBeTruthy()
    const before = (await call(server, 'get', `/public/tracking/${token}`, {})).data
      .data as TrackingApi
    expect(before.step).toBe('planned')
    // No confirmation before the driver's declaration.
    const early = await call(server, 'post', `/public/tracking/${token}/receive-confirm`, {
      body: { signer: 'Rabe' }
    })
    expect(early.status).toBe(409)
    patch({
      arrivedAt: '2026-10-28T09:00:00',
      declaredAt: '2026-10-28T09:10:00',
      receivedQuantity: lineOf().quantity
    })
    const onSite = (await call(server, 'get', `/public/tracking/${token}`, {})).data
      .data as TrackingApi
    expect(onSite.step).toBe('on_site')
    // The driver's declaration never reaches the last step; a name is required.
    const noName = await call(server, 'post', `/public/tracking/${token}/receive-confirm`, {
      body: {}
    })
    expect(noName.status).toBe(400)
    const contested = await call(server, 'post', `/public/tracking/${token}/receive-contest`, {
      body: { reasonNo: onSite.contestReasons[0]!.no, comment: 'Rien reçu' }
    })
    expect((contested.data.data as TrackingApi).receptionContestedAt).not.toBeNull()
    // The planner sees it in dispute on the order card, with its reason (TRS04-US03).
    const card = (
      await call(server, 'get', '/planning/transport-orders/TR-2026-0002', { as: 'PLN001' })
    ).data.data as {
      lines: {
        trackingToken?: string
        receptionContestedAt: string | null
        contestReasonName: string
      }[]
    }
    const disputed = card.lines.find((l) => l.receptionContestedAt)
    expect(disputed?.contestReasonName).toBe(onSite.contestReasons[0]!.name)
    // A contested delivery can no longer be confirmed from the page.
    const after = await call(server, 'post', `/public/tracking/${token}/receive-confirm`, {
      body: { signer: 'Rabe' }
    })
    expect(after.status).toBe(409)
  })

  it('confirms the receipt with the recipient name, which reaches the last step', async () => {
    const token = tokenOf()
    server.db.transportOrders.update('TR-2026-0002', {
      lines: server.db.transportOrders.find('TR-2026-0002')!.lines.map((l) =>
        l.trackingToken === token
          ? {
              ...l,
              arrivedAt: '2026-10-28T09:00:00',
              declaredAt: '2026-10-28T09:10:00',
              receivedQuantity: l.quantity
            }
          : l
      )
    })
    const done = (
      await call(server, 'post', `/public/tracking/${token}/receive-confirm`, {
        body: { signer: 'Hery Rabe' }
      })
    ).data.data as TrackingApi
    expect(done).toMatchObject({ step: 'received', receptionConfirmedBy: 'Hery Rabe' })
  })

  it('refuses the order only while the driver is on site and has not declared', async () => {
    const token = tokenOf()
    const shown = (await call(server, 'get', `/public/tracking/${token}`, {})).data
      .data as TrackingApi
    const reasonNo = shown.refusalReasons[0]!.no
    const notThere = await call(server, 'post', `/public/tracking/${token}/refuse`, {
      body: { reasonNo }
    })
    expect(notThere.status).toBe(409)
    server.db.transportOrders.update('TR-2026-0002', {
      lines: server.db.transportOrders
        .find('TR-2026-0002')!
        .lines.map((l) =>
          l.trackingToken === token ? { ...l, arrivedAt: '2026-10-28T09:00:00' } : l
        )
    })
    const noReason = await call(server, 'post', `/public/tracking/${token}/refuse`, { body: {} })
    expect(noReason.status).toBe(400)
    const refused = (
      await call(server, 'post', `/public/tracking/${token}/refuse`, { body: { reasonNo } })
    ).data.data as TrackingApi
    expect(refused.refusedAt).not.toBeNull()
    expect(refused.refusalReason).not.toBe('')
    // Same result as a refusal recorded by the driver: the line is settled, with its event.
    const row = server.db.transportOrders.find('TR-2026-0002')!
    expect(row.events.at(-1)).toMatchObject({ kind: 'refused' })
    expect(row.lines.find((l) => l.trackingToken === token)?.refusalReasonNo).toBe(reasonNo)
  })

  it('opens the delivery note at the declaration and lets only the recipient sign it', async () => {
    const token = tokenOf()
    const notes = (as: string) =>
      call(server, 'get', '/planning/transport-orders/TR-2026-0002/delivery-notes', { as })
    expect(
      ((await call(server, 'get', `/public/tracking/${token}`, {})).data.data as TrackingApi)
        .deliveryNote
    ).toBeNull()
    server.db.transportOrders.update('TR-2026-0002', {
      lines: server.db.transportOrders.find('TR-2026-0002')!.lines.map((l) =>
        l.trackingToken === token
          ? {
              ...l,
              arrivedAt: '2026-10-28T09:00:00',
              declaredAt: '2026-10-28T09:10:00',
              receivedQuantity: l.quantity
            }
          : l
      )
    })
    const shown = (await call(server, 'get', `/public/tracking/${token}`, {})).data
      .data as TrackingApi
    expect(shown.deliveryNote).toMatchObject({ state: 'awaiting', signedBy: '' })
    // The planner reads it from the order; the driver does not.
    const planner = await notes('PLN001')
    expect((planner.data.data as { state: string }[])[0]).toMatchObject({ state: 'awaiting' })
    expect((await notes('CND001')).status).toBe(403)
    await call(server, 'post', `/public/tracking/${token}/receive-confirm`, {
      body: { signer: 'Hery Rabe' }
    })
    const signed = (await notes('PLN001')).data.data as { state: string; signedBy: string }[]
    expect(signed[0]).toMatchObject({ state: 'signed', signedBy: 'Hery Rabe' })
  })

  it('lists a line not delivered, struck out with its reason', async () => {
    const order = server.db.transportOrders.find('TR-2026-0002')!
    const point = order.lines[0]!.deliveryPointNo
    const refusal = server.db.planningReasons.all().find((r) => r.kind === 'delivery_refusal')!
    server.db.transportOrders.update('TR-2026-0002', {
      lines: [
        {
          ...order.lines[0]!,
          declaredAt: '2026-10-28T09:10:00',
          receivedQuantity: order.lines[0]!.quantity
        },
        {
          ...order.lines[0]!,
          lineNo: 9,
          refusalAt: '2026-10-28T09:05:00',
          refusalReasonNo: refusal.no,
          deliveryPointNo: point
        }
      ]
    })
    const notes = (
      await call(server, 'get', '/planning/transport-orders/TR-2026-0002/delivery-notes', {
        as: 'PLN001'
      })
    ).data.data as { lines: { lineNo: number; notDelivered: boolean; reason: string }[] }[]
    expect(notes[0]!.lines.find((l) => l.lineNo === 9)).toMatchObject({
      notDelivered: true,
      reason: refusal.name
    })
  })
})
