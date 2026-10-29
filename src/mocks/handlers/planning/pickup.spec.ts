import { beforeEach, describe, expect, it } from 'vitest'
import type { LoadingListApi, PickupNoteApi } from '@/modules/planning/loading/types/pickup.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const order = '/planning/transport-orders/TR-2026-0002'
const post = (url: string, body: Record<string, unknown> = {}, as = 'LIV001') =>
  call(server, 'post', url, { as, body, language: 'en' })
const note = async (as = 'LIV001') =>
  (await call(server, 'get', `${order}/pickup-note`, { as })).data.data as PickupNoteApi

/** The recipients confirm through their link: the order is then confirmed, ready to load. */
async function confirmRecipients() {
  for (const line of server.db.transportOrders.find('TR-2026-0002')!.lines) {
    await call(server, 'post', `/public/tracking/${line.trackingToken}/confirm`, {})
  }
}

describe('pickup note', () => {
  it('is issued with the planned order, sent to the site, then confirmed with its data', async () => {
    const issued = await note()
    expect(issued).toMatchObject({ status: 'issued', orderNo: 'TR-2026-0002' })
    expect(issued.vehiclePlate).not.toBe('')
    expect(issued.compartments[0]!.entries.length).toBeGreaterThan(0)
    // The planner reads it, the delivery manager sends it.
    expect(
      (await post(`${order}/pickup-note/send`, { email: 'depot@x.mg' }, 'PLN001')).status
    ).toBe(403)
    expect((await post(`${order}/pickup-note/send`, { email: 'pas-un-mail' })).status).toBe(400)
    const sent = (await post(`${order}/pickup-note/send`, { email: 'depot@x.mg' })).data
      .data as PickupNoteApi
    expect(sent).toMatchObject({ status: 'sent', sentTo: 'depot@x.mg' })
    // Loading is confirmed once the order is confirmed by its recipients.
    const entries = issued.compartments.flatMap((c) =>
      c.entries.map((e) => ({
        compartmentNo: c.no,
        lineNo: e.lineNo,
        loadedQuantity: e.expectedQuantity
      }))
    )
    expect(
      (await post(`${order}/pickup-note/confirm`, { documentRef: 'BSL-1', entries })).status
    ).toBe(409)
    await confirmRecipients()
    expect((await post(`${order}/pickup-note/confirm`, { entries })).status).toBe(400)
    const done = (await post(`${order}/pickup-note/confirm`, { documentRef: 'BSL-1', entries }))
      .data.data as PickupNoteApi
    expect(done).toMatchObject({ status: 'confirmed', documentRef: 'BSL-1' })
    const line = server.db.transportOrders.find('TR-2026-0002')!.lines[0]!
    expect(line.loadedQuantity).toBe(entries[0]!.loadedQuantity)
    // Confirmed, it no longer changes.
    expect(
      (await post(`${order}/pickup-note/confirm`, { documentRef: 'BSL-2', entries })).status
    ).toBe(409)
    expect((await post(`${order}/pickup-note/send`, { email: 'depot@x.mg' })).status).toBe(409)
  })

  it('asks fuel for its temperature, density and volume at 15 °C', async () => {
    const row = server.db.transportOrders.find('TR-2026-0002')!
    server.db.transportOrders.update(row.no, {
      lines: row.lines.map((line) => ({ ...line, productNo: 'PRD-006' }))
    })
    await confirmRecipients()
    const fuel = await note()
    expect(fuel.compartments[0]!.entries[0]!.isFuel).toBe(true)
    const base = fuel.compartments.flatMap((c) =>
      c.entries.map((e) => ({
        compartmentNo: c.no,
        lineNo: e.lineNo,
        loadedQuantity: e.expectedQuantity
      }))
    )
    expect(
      (await post(`${order}/pickup-note/confirm`, { documentRef: 'BSL-9', entries: base })).status
    ).toBe(400)
    const measured = base.map((e) => ({
      ...e,
      temperatureC: 28,
      density: 0.84,
      volume15L: e.loadedQuantity - 5
    }))
    const done = (
      await post(`${order}/pickup-note/confirm`, { documentRef: 'BSL-9', entries: measured })
    ).data.data as PickupNoteApi
    expect(done.compartments[0]!.entries[0]).toMatchObject({ temperatureC: 28, density: 0.84 })
  })

  it('has no pickup note while the order is a draft', async () => {
    expect(
      (
        await call(server, 'get', '/planning/transport-orders/TR-2026-0001/pickup-note', {
          as: 'LIV001'
        })
      ).status
    ).toBe(409)
  })
})

describe('loading list', () => {
  it('lists one space in the reverse order of delivery, with vehicle, driver and date', async () => {
    const list = (await call(server, 'get', `${order}/loading-list`, { as: 'PLN001' })).data
      .data as LoadingListApi
    expect(list.mode).toBe('one_space')
    expect(list.vehiclePlate).not.toBe('')
    const draft = (
      await call(server, 'get', '/planning/transport-orders/TR-2026-0001/loading-list', {
        as: 'PLN001'
      })
    ).data.data as LoadingListApi
    // Lines 1 then 2 are delivered in that order: line 2 is loaded first.
    expect(draft.groups[0]!.lines.map((line) => line.lineNo)).toEqual([2, 1])
  })
})
