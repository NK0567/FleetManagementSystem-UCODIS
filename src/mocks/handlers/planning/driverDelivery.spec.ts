import { beforeEach, describe, expect, it } from 'vitest'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const as = 'CND001'
const point = () => server.db.transportOrders.find('TR-2026-0003')!.lines[0]!.deliveryPointNo
const declare = (lines: Record<string, unknown>[]) =>
  call(server, 'post', `/me/orders/TR-2026-0003/points/${point()}/declare`, {
    as,
    body: { lines },
    language: 'en'
  })

describe('declaring a delivery line by line (TRS03-US11)', () => {
  it('refuses before the arrival and when nothing stays delivered', async () => {
    // Back before the driver's arrival on the point, which the demo already marks.
    const seeded = server.db.transportOrders.find('TR-2026-0003')!
    server.db.transportOrders.update(seeded.no, {
      lines: seeded.lines.map((item) => ({ ...item, arrivedAt: null }))
    })
    expect((await declare([{ lineNo: 1, delivered: true, receivedQuantity: 150 }])).status).toBe(
      409
    )
    await call(server, 'post', '/me/orders/TR-2026-0003/lines/1/arrive', { as })
    const none = await declare([{ lineNo: 1, delivered: false, reasonNo: 'RFS-DAMAGED' }])
    expect(none.status).toBe(422)
    expect(none.data.message).toContain('At least one product line')
  })

  it('keeps an unchecked line with its reason, as a remainder and goods to bring back', async () => {
    const row = server.db.transportOrders.find('TR-2026-0003')!
    // A second product line for the same recipient.
    server.db.transportOrders.update(row.no, {
      lines: [
        ...row.lines,
        { ...row.lines[0]!, lineNo: 2, productNo: 'PRD-002', quantity: 20, loadedQuantity: 20 }
      ]
    })
    await call(server, 'post', '/me/orders/TR-2026-0003/lines/1/arrive', { as })
    // An unchecked line needs its reason.
    expect(
      (
        await declare([
          { lineNo: 1, delivered: true, receivedQuantity: 150 },
          { lineNo: 2, delivered: false }
        ])
      ).status
    ).toBe(400)
    const done = await declare([
      { lineNo: 1, delivered: true, receivedQuantity: 150 },
      { lineNo: 2, delivered: false, reasonNo: 'RFS-DAMAGED', comment: 'Cartons écrasés' }
    ])
    expect(done.status).toBe(200)
    const lines = server.db.transportOrders.find('TR-2026-0003')!.lines
    expect(lines[1]).toMatchObject({ receivedQuantity: 0, undeliveredReasonNo: 'RFS-DAMAGED' })
    // The delivery note lists it struck out with its reason.
    const notes = (
      await call(server, 'get', '/planning/transport-orders/TR-2026-0003/delivery-notes', {
        as: 'PLN001'
      })
    ).data.data as { lines: { lineNo: number; notDelivered: boolean; reason: string }[] }[]
    expect(notes[0]!.lines.find((line) => line.lineNo === 2)).toMatchObject({ notDelivered: true })
    // The driver keeps the reminder until he brings it back.
    const returns = (await call(server, 'get', '/me/returns', { as })).data.data as {
      lineNo: number
    }[]
    expect(returns.map((item) => item.lineNo)).toEqual([2])
    expect(
      (await call(server, 'post', '/me/orders/TR-2026-0003/lines/2/hand-back', { as })).status
    ).toBe(200)
    expect((await call(server, 'get', '/me/returns', { as })).data.data).toEqual([])
  })

  it('asks fuel for its measures and keeps them on the delivery note (TRS03-US10)', async () => {
    const row = server.db.transportOrders.find('TR-2026-0003')!
    server.db.transportOrders.update(row.no, {
      lines: row.lines.map((line) => ({ ...line, productNo: 'PRD-006', loadedQuantity: 9000 }))
    })
    await call(server, 'post', '/me/orders/TR-2026-0003/lines/1/arrive', { as })
    expect((await declare([{ lineNo: 1, delivered: true, receivedQuantity: 9000 }])).status).toBe(
      400
    )
    const done = await declare([
      {
        lineNo: 1,
        delivered: true,
        deliveredVolumeL: 9000,
        temperatureC: 30,
        density: 0.84,
        volume15L: 8890
      }
    ])
    expect(done.status).toBe(200)
    expect(
      server.db.transportOrders.find('TR-2026-0003')!.lines[0]!.deliveryMeasures
    ).toMatchObject({
      volume15L: 8890
    })
  })
})
