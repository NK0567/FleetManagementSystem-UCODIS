import { beforeEach, describe, expect, it } from 'vitest'
import type { PickupNoteApi } from '@/modules/planning/loading/types/pickup.types'
import type {
  TransportOrderApi,
  TransportOrderClosingApi
} from '@/modules/planning/transport-orders/types/transportOrder.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

/* The demo carries a planned fuel order on a tanker with compartments, two stations and three
 * product lines (TRS03-US01, US04, US09, US10, US11, US16). */
const NO = 'TR-2026-0000'
const order = `/planning/transport-orders/${NO}`
const driver = 'CND002'
const post = (url: string, body: Record<string, unknown> = {}, as = 'LIV001') =>
  call(server, 'post', url, { as, body, language: 'en' })
const view = async (as = 'LIV001') =>
  (await call(server, 'get', order, { as })).data.data as TransportOrderApi

/** The pickup is confirmed with the measures of the fuel, compartment by compartment. */
async function confirmPickup(volume15Of: (expected: number) => number = (expected) => expected) {
  const note = (await call(server, 'get', `${order}/pickup-note`, { as: 'LIV001' })).data
    .data as PickupNoteApi
  const entries = note.compartments.flatMap((compartment) =>
    compartment.entries.map((entry) => ({
      compartmentNo: compartment.no,
      lineNo: entry.lineNo,
      loadedQuantity: entry.expectedQuantity,
      temperatureC: 28,
      density: 0.8,
      volume15L: volume15Of(entry.expectedQuantity)
    }))
  )
  return post(`${order}/pickup-note/confirm`, { documentRef: 'BSL-0001', entries }, 'DEP001')
}

const check = (lineNos: number[], extra: Record<string, unknown> = {}) =>
  post(`/me/orders/${NO}/check`, { lineNos, verdict: 'conform', ...extra }, driver)
const arrive = (lineNo: number) => post(`/me/orders/${NO}/lines/${lineNo}/arrive`, {}, driver)

describe('the demo fuel order', () => {
  it('is planned on a tanker with compartments, loaded at the Alarobia depot', async () => {
    const fuel = await view()
    expect(fuel).toMatchObject({ status: 'confirmed', means: 'fleet', tripNo: 'TRP-00000' })
    expect(fuel.compartmentPlan!.compartments.length).toBeGreaterThan(1)
    expect(fuel.lines.map((line) => line.deliveryPointNo)).toEqual(['DP-011', 'DP-012', 'DP-012'])
    const note = (await call(server, 'get', `${order}/pickup-note`, { as: 'LIV001' })).data
      .data as PickupNoteApi
    expect(note.pickupSiteName).toBe("Dépôt pétrolier d'Alarobia")
    // The loading list follows the compartments (TRS03-US06 CA02).
    const list = (await call(server, 'get', `${order}/loading-list`, { as: 'LIV001' })).data
      .data as {
      mode: string
    }
    expect(list.mode).toBe('compartments')
  })

  it('asks the measures at 15 °C at the pickup, then lets the driver check by compartment', async () => {
    const refused = await post(
      `${order}/pickup-note/confirm`,
      { documentRef: 'BSL-0001', entries: [] },
      'DEP001'
    )
    expect(refused.status).toBe(422)
    expect((await check([1, 2, 3])).status).toBe(409)
    expect((await confirmPickup()).status).toBe(200)
    expect((await view()).status).toBe('confirmed')
    // One verdict for the lines of one compartment, then the shortcut for the rest.
    const first = await check([1])
    expect(first.status).toBe(200)
    expect(first.data.data).toMatchObject({ ready: false })
    expect((await check([2, 3])).data.data).toMatchObject({ ready: true, status: 'ready' })
  })

  it('opens the second point only once the first one is settled (TRS03-US09 CA02)', async () => {
    await confirmPickup()
    await check([1, 2, 3])
    // The second point cannot be started before the first one is settled.
    const early = await arrive(2)
    expect(early.status).toBe(409)
    expect((await arrive(1)).status).toBe(200)
    expect((await view()).status).toBe('in_progress')
    const declared = await post(
      `/me/orders/${NO}/points/DP-011/declare`,
      {
        lines: [
          {
            lineNo: 1,
            delivered: true,
            deliveredVolumeL: 9000,
            temperatureC: 31,
            density: 0.75,
            volume15L: 8940
          }
        ]
      },
      driver
    )
    expect(declared.status).toBe(200)
    expect((await arrive(2)).status).toBe(200)
  })

  it('delivers the second station line by line, with the measures and the reason', async () => {
    await confirmPickup()
    await check([1, 2, 3])
    await arrive(1)
    await post(
      `/me/orders/${NO}/points/DP-011/declare`,
      {
        lines: [
          {
            lineNo: 1,
            delivered: true,
            deliveredVolumeL: 9000,
            temperatureC: 31,
            density: 0.75,
            volume15L: 9000
          }
        ]
      },
      driver
    )
    await arrive(2)
    const partial = await post(
      `/me/orders/${NO}/points/DP-012/declare`,
      {
        lines: [
          {
            lineNo: 2,
            delivered: true,
            deliveredVolumeL: 11900,
            temperatureC: 29,
            density: 0.84,
            // 100 L short at 15 °C against a tolerance of 20 L: a gap to qualify.
            volume15L: 11900
          },
          { lineNo: 3, delivered: false, reasonNo: 'RFS-DAMAGED', comment: 'Cuve pleine' }
        ]
      },
      driver
    )
    expect(partial.status).toBe(200)
    const lines = server.db.transportOrders.find(NO)!.lines
    expect(lines[1]).toMatchObject({ quantityGap: -100, deliveryMeasures: { volume15L: 11900 } })
    expect(lines[2]).toMatchObject({ receivedQuantity: 0, undeliveredReasonNo: 'RFS-DAMAGED' })
    // The recipient sees the line not delivered struck out with its reason, and the volume at
    // 15 °C of the fuel delivered, on the delivery note of his page (TRS02-US05 CA04, TRS05-US03).
    const token = server.db.transportOrders.find(NO)!.lines[1]!.trackingToken
    const page = (await call(server, 'get', `/public/tracking/${token}`, {})).data.data as {
      deliveryNote: {
        lines: {
          lineNo: number
          notDelivered: boolean
          reason: string
          measures: { volume15L: number } | null
        }[]
      }
    }
    expect(page.deliveryNote.lines.find((item) => item.lineNo === 3)).toMatchObject({
      notDelivered: true
    })
    expect(page.deliveryNote.lines.find((item) => item.lineNo === 2)!.measures).toMatchObject({
      volume15L: 11900
    })
    // The gap shows in the fuel table of the reports (TRS08-US03 CA02).
    const report = (await call(server, 'get', '/planning/reports/transport', { as: 'LIV001' })).data
      .data as { quality: { fuelGaps: { rows: { orderNo: string; gap: number }[] } } }
    expect(report.quality.fuelGaps.rows).toContainEqual(
      expect.objectContaining({ orderNo: NO, gap: -100 })
    )
  })
})

describe('a point only postponed blocks the end of the order (TRS03-US12 CA04)', () => {
  it('names the postponed point, then lets the order end once it is settled', async () => {
    await confirmPickup()
    await check([1, 2, 3])
    await arrive(1)
    const postponed = await post(
      `/me/orders/${NO}/lines/1/postpone`,
      { reasonNo: 'PST-ACCESS' },
      driver
    )
    expect(postponed.status).toBe(200)
    const closing = (await call(server, 'get', `${order}/closing`, { as: 'LIV001' })).data
      .data as TransportOrderClosingApi
    expect(closing.blocks).toContain('postponed')
    const refused = await post(`${order}/close`)
    expect(refused.status).toBe(422)
    expect(refused.data.message).toContain('A postponed point is still to retry or cancel')
    // Retried, the point is open again and the order is not blocked by it any more.
    expect((await post(`/me/orders/${NO}/points/DP-011/retry`, {}, driver)).status).toBe(200)
    const after = (await call(server, 'get', `${order}/closing`, { as: 'LIV001' })).data
      .data as TransportOrderClosingApi
    expect(after.blocks).not.toContain('postponed')
    expect(after.blocks).toContain('not_delivered')
  })
})

describe('a line out of the order before loading is not the driver’s (TRS03-US08 CA02)', () => {
  it('leaves his order, but stays with the planner', async () => {
    const line = server.db.transportOrders.find(NO)!.lines[2]!
    const token = line.trackingToken
    const answered = await call(server, 'post', `/public/tracking/${token}/unavailable`, {
      body: { reasonNo: 'UNV-CLOSED' }
    })
    expect(answered.status).toBe(200)
    const mine = (await call(server, 'get', '/me/orders', { as: driver })).data.data as {
      no: string
      lines: { lineNo: number }[]
    }[]
    expect(mine.find((item) => item.no === NO)!.lines.map((item) => item.lineNo)).toEqual([1, 2])
    expect((await view()).lines).toHaveLength(3)
  })
})

describe('the position of the vehicle completes the order (TRS02-US01 CA01)', () => {
  it('gives the position from the fleet tracking, even before departure', async () => {
    const eta = (await call(server, 'get', `${order}/eta`, { as: 'PLN001' })).data.data as {
      position: { latitude: number; longitude: number; stops: unknown[] } | null
    }
    expect(eta.position).not.toBeNull()
    expect(eta.position!.stops.length).toBeGreaterThan(0)
  })
})

describe('the perimeter is said on the screens (TRS07-US02 CA02, TRS08-US01)', () => {
  it('tells the direction its figures stay in its region', async () => {
    type Choices = { perimeter: { regions: string[] } | null; regions: string[] }
    const choicesOf = async (as: string) => {
      const res = await call(server, 'get', '/planning/dashboard', { as })
      return (res.data as { data: { choices: Choices } }).data.choices
    }
    const choices = await choicesOf('DIR001')
    expect(choices.perimeter).toMatchObject({ regions: ['Boeny'] })
    expect(choices.regions).toEqual(['Boeny'])
    expect((await choicesOf('LIV001')).perimeter).toBeNull()
  })
})

describe('the closing section after the end of the order (TRS05-US06 CA04)', () => {
  it('no longer blocks an order that is terminated', async () => {
    const fuel = server.db.transportOrders.find('TR-2026-0003')!
    // A delivered order whose reception is attested, then terminated.
    server.db.transportOrders.update(fuel.no, {
      lines: fuel.lines.map((line) => ({
        ...line,
        declaredAt: line.declaredAt ?? '2026-09-04T10:00:00',
        receivedQuantity: 150,
        receptionConfirmedAt: '2026-09-04T11:00:00',
        receptionConfirmedBy: 'Rabe'
      })),
      closedAt: '2026-09-04T12:00:00',
      closedBy: 'LIV001'
    })
    const closing = (
      await call(server, 'get', '/planning/transport-orders/TR-2026-0003/closing', { as: 'LIV001' })
    ).data.data as TransportOrderClosingApi
    // Only the documents the company requires can still be missing; the order is delivered.
    expect(closing.blocks).not.toContain('not_delivered')
    expect(closing.blocks).not.toContain('reception')
  })
})

describe('a recipient who asked for no notification (TRS02-US02 CA03)', () => {
  it('gets no message when his order is planned, while the others do', async () => {
    const send = (url: string, body: Record<string, unknown>) =>
      call(server, 'post', url, { as: 'PLN001', body, language: 'en' })
    expect(server.db.deliveryRequests.find('DL-2026-0001')!.notificationChannel).toBe('none')
    const created = (
      await send('/planning/transport-orders', {
        routeTemplateNo: 'TNR-ATS',
        plannedDeparture: '2026-09-12T06:00',
        deliveryRequestNos: ['DL-2026-0001', 'DL-2026-0002']
      })
    ).data.data as TransportOrderApi
    const planned = await send(`/planning/transport-orders/${created.no}/plan`, {
      means: 'fleet',
      vehicleNo: 'VEH-001',
      trailerNo: 'VEH-011',
      driverNo: 'UCT-013',
      force: true
    })
    expect(planned.status, JSON.stringify(planned.data)).toBe(200)
    const lines = server.db.transportOrders.find(created.no)!.lines
    const silent = lines.find((line) => line.deliveryRequestNo === 'DL-2026-0001')!
    const told = lines.find((line) => line.deliveryRequestNo === 'DL-2026-0002')!
    expect(silent.recipientMessages ?? []).toEqual([])
    expect(told.recipientMessages?.[0]).toMatchObject({ kind: 'planned' })
  })
})
