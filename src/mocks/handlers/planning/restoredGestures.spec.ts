import { beforeEach, describe, expect, it } from 'vitest'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'
import type { TransportOrderLineRow } from '../../fixtures/planning/transportOrders'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const as = (code: string, method: 'get' | 'post' | 'put' | 'patch', url: string, body = {}) =>
  call(server, method, url, { as: code, body, language: 'en' })
const order = (no: string) => server.db.transportOrders.find(no)!
const patchLine = (no: string, lineNo: number, patch: Partial<TransportOrderLineRow>) =>
  server.db.transportOrders.update(no, {
    lines: order(no).lines.map((line) => (line.lineNo === lineNo ? { ...line, ...patch } : line))
  })
const tokenOf = (no: string, lineNo = 1) =>
  order(no).lines.find((line) => line.lineNo === lineNo)!.trackingToken!

/* TR-2026-0002 waits for its loading check by its driver (CND014). */
async function loadForCheck() {
  await as('CLI001', 'post', '/planning/transport-orders/TR-2026-0002/lines/1/confirm')
  await as('DEP001', 'put', '/planning/transport-orders/TR-2026-0002/loading', {
    lines: [{ lineNo: 1, loadedQuantity: 400 }]
  })
}

describe('the driver corrects an entry made by mistake (v57)', () => {
  it('withdraws his non-conformity while the order is being loaded, with a reason', async () => {
    await loadForCheck()
    const url = '/me/orders/TR-2026-0002/lines/1/cancel-nonconformity'
    // Nothing to cancel yet.
    expect((await as('CND014', 'post', url, { comment: 'Erreur' })).status).toBe(409)
    await as('CND014', 'post', '/me/orders/TR-2026-0002/check', {
      lineNos: [1],
      verdict: 'nonconform',
      reasonNo: 'NCF-QUANTITY'
    })
    const mine = (await as('CND014', 'get', '/me/orders')).data.data as {
      lines: { nonconformityReason: string }[]
    }[]
    expect(mine[0]!.lines[0]!.nonconformityReason).not.toBe('')
    // A reason is required; another driver cannot do it.
    expect((await as('CND014', 'post', url, {})).status).toBe(400)
    expect((await as('CND001', 'post', url, { comment: 'Erreur' })).status).toBe(403)
    expect((await as('CND014', 'post', url, { comment: 'Erreur de saisie' })).status).toBe(200)
    const line = order('TR-2026-0002').lines[0]!
    expect(line).toMatchObject({ nonconformityAt: null, conformingAt: null })
    expect(order('TR-2026-0002').events.at(-1)).toMatchObject({ kind: 'correction' })
    // The line is to check again.
    const checked = await as('CND014', 'post', '/me/orders/TR-2026-0002/check', {
      lineNos: [1],
      verdict: 'conform'
    })
    expect(checked.data.data).toMatchObject({ status: 'ready' })
  })

  it('no longer withdraws it once the line is replanned or the loading is over', async () => {
    await loadForCheck()
    await as('CND014', 'post', '/me/orders/TR-2026-0002/check', {
      lineNos: [1],
      verdict: 'nonconform',
      reasonNo: 'NCF-QUANTITY'
    })
    patchLine('TR-2026-0002', 1, { replannedAt: '2026-09-04T10:00:00' })
    const url = '/me/orders/TR-2026-0002/lines/1/cancel-nonconformity'
    expect((await as('CND014', 'post', url, { comment: 'Erreur' })).status).toBe(409)
  })

  it('withdraws his declaration until the recipient answers', async () => {
    const point = order('TR-2026-0003').lines[0]!.deliveryPointNo
    const url = `/me/orders/TR-2026-0003/points/${point}/cancel-declaration`
    expect((await as('CND001', 'post', url, { comment: 'Erreur' })).status).toBe(409)
    await as('CND001', 'post', `/me/orders/TR-2026-0003/points/${point}/declare`, {
      lines: [{ lineNo: 1, delivered: true, receivedQuantity: 150 }]
    })
    expect((await as('CND001', 'post', url, { comment: '' })).status).toBe(400)
    expect((await as('CND001', 'post', url, { comment: 'Mauvais point' })).status).toBe(200)
    expect(order('TR-2026-0003').lines[0]).toMatchObject({
      declaredAt: null,
      receivedQuantity: null
    })
    // Declared again, then confirmed by the recipient: it stays.
    await as('CND001', 'post', `/me/orders/TR-2026-0003/points/${point}/declare`, {
      lines: [{ lineNo: 1, delivered: true, receivedQuantity: 150 }]
    })
    await call(server, 'post', `/public/tracking/${tokenOf('TR-2026-0003')}/receive-confirm`, {
      body: { signer: 'Le gérant' }
    })
    const late = await as('CND001', 'post', url, { comment: 'Trop tard' })
    expect(late.status).toBe(409)
    expect(late.data.message).toContain('confirmed or contested')
  })

  it('withdraws his own refusal while on site, never the recipient’s', async () => {
    const url = '/me/orders/TR-2026-0003/lines/1/cancel-refusal'
    await as('CND001', 'post', '/me/orders/TR-2026-0003/lines/1/refuse', {
      reasonNo: 'RFS-DAMAGED'
    })
    expect(order('TR-2026-0003').lines[0]!.refusalBy).toBe('driver')
    expect((await as('CND001', 'post', url, { comment: 'Erreur de saisie' })).status).toBe(200)
    expect(order('TR-2026-0003').lines[0]).toMatchObject({ refusalAt: null })
    // The recipient refuses himself from his link: the driver cannot undo it.
    await call(server, 'post', `/public/tracking/${tokenOf('TR-2026-0003')}/refuse`, {
      body: { reasonNo: 'RFS-DAMAGED' }
    })
    const theirs = await as('CND001', 'post', url, { comment: 'Erreur' })
    expect(theirs.status).toBe(409)
    expect(theirs.data.message).toContain('own link')
  })

  it('no longer withdraws a refusal once the next point is started', async () => {
    const row = order('TR-2026-0003')
    server.db.transportOrders.update(row.no, {
      lines: [...row.lines, { ...row.lines[0]!, lineNo: 2, deliveryPointNo: 'DP-002' }]
    })
    patchLine('TR-2026-0003', 2, { arrivedAt: null })
    await as('CND001', 'post', '/me/orders/TR-2026-0003/lines/1/refuse', {
      reasonNo: 'RFS-DAMAGED'
    })
    await as('CND001', 'post', '/me/orders/TR-2026-0003/lines/2/arrive')
    const refused = await as('CND001', 'post', '/me/orders/TR-2026-0003/lines/1/cancel-refusal', {
      comment: 'Erreur'
    })
    expect(refused.status).toBe(409)
    expect(refused.data.message).toContain('next point')
  })

  it('retries a point simply postponed, not one whose goods go back (TRS03-US12)', async () => {
    const point = order('TR-2026-0003').lines[0]!.deliveryPointNo
    const url = `/me/orders/TR-2026-0003/points/${point}/retry`
    expect((await as('CND001', 'post', url)).status).toBe(409)
    await as('CND001', 'post', '/me/orders/TR-2026-0003/lines/1/postpone', {
      reasonNo: 'PST-CUSTOMER',
      withReturn: true
    })
    expect((await as('CND001', 'post', url)).status).toBe(409)
    patchLine('TR-2026-0003', 1, { returnedAt: null })
    expect((await as('CND001', 'post', url)).status).toBe(200)
    expect(order('TR-2026-0003').lines[0]).toMatchObject({ postponedAt: null })
  })
})

describe('the justification of a gap outside tolerance', () => {
  it('is required when the company blocks, and sent with the point declaration', async () => {
    const settings = server.db.planningSettings.findOrFail('PLANNING')
    server.db.planningSettings.update('PLANNING', {
      quantities: { ...settings.quantities, overToleranceMode: 'block' }
    })
    const mine = (await as('CND001', 'get', '/me/orders')).data.data as {
      overToleranceMode: string
      lines: { tolerance: { loaded: number; rule: unknown } }[]
    }[]
    expect(mine[0]).toMatchObject({ overToleranceMode: 'block' })
    expect(mine[0]!.lines[0]!.tolerance).toMatchObject({ loaded: 150 })
    expect(mine[0]!.lines[0]!.tolerance.rule).not.toBeNull()
    const point = order('TR-2026-0003').lines[0]!.deliveryPointNo
    const url = `/me/orders/TR-2026-0003/points/${point}/declare`
    const blocked = await as('CND001', 'post', url, {
      lines: [{ lineNo: 1, delivered: true, receivedQuantity: 140 }]
    })
    expect(blocked.status).toBe(422)
    const done = await as('CND001', 'post', url, {
      lines: [
        { lineNo: 1, delivered: true, receivedQuantity: 140, justification: 'Carton manquant' }
      ]
    })
    expect(done.status).toBe(200)
    expect(order('TR-2026-0003').lines[0]).toMatchObject({
      quantityGap: -10,
      gapComment: 'Carton manquant'
    })
  })
})

describe('the recipient’s page (v57)', () => {
  const page = async (token: string) =>
    (await call(server, 'get', `/public/tracking/${token}`)).data.data as Record<string, unknown>

  it('shows a postponement with its reason, then lets him give or accept a date', async () => {
    const token = tokenOf('TR-2026-0003')
    await as('CND001', 'post', '/me/orders/TR-2026-0003/lines/1/postpone', {
      reasonNo: 'PST-CUSTOMER',
      withReturn: true
    })
    const shown = await page(token)
    expect(shown).toMatchObject({ open: false, replanOpen: true })
    expect(shown.postponedAt).not.toBeNull()
    expect(shown.returnedAt).not.toBeNull()
    expect(shown.postponementReason).not.toBe('')
    // His own date, which must not be in the past.
    const date = '2099-01-10'
    expect(
      (
        await call(server, 'post', `/public/tracking/${token}/unavailable`, {
          body: { date: '2000-01-01' }
        })
      ).status
    ).toBe(422)
    const given = await call(server, 'post', `/public/tracking/${token}/unavailable`, {
      body: { date }
    })
    expect(given.data.data).toMatchObject({ availableOn: date })
    // The planner counter-proposes; the recipient agrees and the line is replanned.
    const propose = await as(
      'PLN001',
      'post',
      '/planning/transport-orders/TR-2026-0003/lines/1/replan/propose',
      { date: '2099-01-12' }
    )
    expect(propose.status).toBe(200)
    const accepted = await call(server, 'post', `/public/tracking/${token}/accept-proposal`)
    expect(accepted.status).toBe(200)
    expect(order('TR-2026-0003').lines[0]).toMatchObject({ replannedOn: '2099-01-12' })
    expect(await page(token)).toMatchObject({ replanOpen: false })
  })

  it('refuses a date while the line is still in the order on the road', async () => {
    const token = tokenOf('TR-2026-0003')
    expect((await page(token)).replanOpen).toBe(false)
    const refused = await call(server, 'post', `/public/tracking/${token}/unavailable`, {
      body: { date: '2099-01-10', reasonNo: 'UNV-CLOSED' }
    })
    expect(refused.status).toBe(409)
  })

  it('shows the cancellation of the order with its reason', async () => {
    const token = tokenOf('TR-2026-0004')
    await as('PLN001', 'post', '/planning/transport-orders/TR-2026-0004/cancel', {
      reasonNo: 'CXL-CUSTOMER'
    })
    const shown = await page(token)
    expect(shown.cancelledAt).not.toBeNull()
    expect(shown.cancellationReason).not.toBe('')
  })

  it('lists the deliveries of an order split into several trucks', async () => {
    const parts = (await page(tokenOf('TR-2026-0004'))).parts as {
      requestNo: string
      vehiclePlate: string
      state: string
      current: boolean
    }[]
    expect(parts).toHaveLength(2)
    expect(parts.find((part) => part.current)).toMatchObject({
      requestNo: 'DL-2026-0011',
      vehiclePlate: '2345 TBA',
      state: 'planned'
    })
    expect(parts.find((part) => !part.current)).toMatchObject({
      requestNo: 'DL-2026-0013',
      state: 'to_plan'
    })
    // A delivery of a single truck lists none.
    expect((await page(tokenOf('TR-2026-0003'))).parts).toEqual([])
  })

  it('reaches him on the phone of his order rather than his customer record', async () => {
    const lines = (await as('CLI001', 'get', '/planning/confirmations')).data.data as {
      orderNo: string
      recipientContact: string
    }[]
    expect(lines.find((line) => line.orderNo === 'TR-2026-0004')?.recipientContact).toBe(
      '034 05 112 47'
    )
  })
})

describe('transport orders late, by period, depot and region (v57)', () => {
  it('filters on the departure day, the region and the late flag', async () => {
    const list = async (filters: unknown[]) =>
      (
        await call(server, 'get', '/planning/transport-orders', {
          as: 'PLN001',
          query: { page: '1', pageSize: '100', filters: JSON.stringify(filters) }
        })
      ).data.data as { items: { no: string; regions: string[]; late: boolean }[] }
    const all = await list([])
    const day = order('TR-2026-0004').plannedDeparture!.slice(0, 10)
    const sameDay = await list([
      { field: 'plannedDate', valueType: 'date', value: day, operator: '>=' },
      { field: 'plannedDate', valueType: 'date', value: day, operator: '<=' }
    ])
    expect(sameDay.items.map((item) => item.no)).toContain('TR-2026-0004')
    const region = all.items.find((item) => item.regions.length)!.regions[0]!
    const inRegion = await list([{ field: 'regions', valueType: 'string', value: region }])
    expect(inRegion.items.length).toBeGreaterThan(0)
    expect(inRegion.items.every((item) => item.regions.includes(region))).toBe(true)
    const late = await list([{ field: 'late', valueType: 'boolean', value: true }])
    expect(late.items.every((item) => item.late)).toBe(true)
  })
})

describe('the driver’s own space (v57)', () => {
  it('gives the driver his responsibilities and the driving limits in force', async () => {
    const me = (await as('CND001', 'get', '/me')).data.data as {
      responsibilities: string[]
      drivingLimits: Record<string, number> | null
    }
    expect(me.responsibilities.length).toBeGreaterThan(0)
    expect(me.drivingLimits).toMatchObject({
      dailyDrivingMaxMin: expect.any(Number),
      dailyRestMinH: expect.any(Number),
      weeklyDrivingMaxH: expect.any(Number)
    })
    // An assistant does not drive: no limits for him.
    const assistant = (await as('AID001', 'get', '/me')).data.data as { drivingLimits: unknown }
    expect(assistant?.drivingLimits ?? null).toBeNull()
  })
})

describe('the recipient’s contact on the order (v57)', () => {
  it('accepts a phone and an e-mail of its own, and refuses a malformed one', async () => {
    const no = 'DL-2026-0001'
    const bad = await as('PLN001', 'patch', `/planning/delivery-requests/${no}`, {
      recipientEmail: 'pas un e-mail'
    })
    expect(bad.status).toBe(400)
    const saved = await as('PLN001', 'patch', `/planning/delivery-requests/${no}`, {
      recipientPhone: '034 22 333 44',
      recipientEmail: 'magasin@exemple.mg'
    })
    expect(saved.status).toBe(200)
    expect(server.db.deliveryRequests.find(no)).toMatchObject({
      recipientPhone: '034 22 333 44',
      recipientEmail: 'magasin@exemple.mg'
    })
  })
})
