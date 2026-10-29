import { stillToLoad } from '@/modules/planning/loading/domain/loading'
import type {
  LoadingListApi,
  PickupCompartmentApi,
  PickupNoteApi
} from '@/modules/planning/loading/types/pickup.types'
import { nowIsoDateTime } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import type { PickupRecord, TransportOrderRow } from '../../fixtures/planning/transportOrders'
import { readBody, routeParam, stampModified } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import { invalidField, readNumber, readString } from '../../http/input'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser } from '../../http/types'
import { PLANNING_MESSAGES } from './messages'
import { transportOrdersApi } from './transportOrders'

const EMPTY: PickupRecord = {
  sentAt: null,
  sentTo: '',
  confirmedAt: null,
  confirmedBy: null,
  documentRef: '',
  entries: []
}

/** The pickup note exists once the order is planned on a vehicle, and until it is cancelled. */
const NOTE_STATUSES = ['planned', 'confirmed', 'ready', 'in_progress', 'completed']

/** The order as the screens see it; its row was found before. */
const orderApi = (db: MockDatabase, no: string) =>
  transportOrdersApi(db).find((order) => order.no === no)!

/** The pickup site is the first stop of the order's route (TRS07-US02: depots are sites). */
function pickupSite(db: MockDatabase, routeNo: string | null) {
  const route = routeNo ? db.routeTemplates.find(routeNo) : undefined
  const first = route?.stops[0]
  return first ? db.sites.find(first.siteNo) : undefined
}

export function pickupNoteOf(db: MockDatabase, row: TransportOrderRow): PickupNoteApi | null {
  const order = orderApi(db, row.no)
  if (!order.means || !NOTE_STATUSES.includes(order.status)) return null
  const record = row.pickup ?? EMPTY
  const entryOf = (compartmentNo: number, lineNo: number) =>
    record.entries.find((item) => item.compartmentNo === compartmentNo && item.lineNo === lineNo)
  const lines = order.lines.filter((line) =>
    stillToLoad(row.lines.find((r) => r.lineNo === line.lineNo)!)
  )
  const fuel = new Set(
    db.products
      .all()
      .filter((p) => p.isFuel)
      .map((p) => p.no)
  )
  const entry = (compartmentNo: number, lineNo: number, expected: number) => {
    const line = lines.find((item) => item.lineNo === lineNo)!
    const saved = entryOf(compartmentNo, lineNo)
    return {
      lineNo,
      recipientName: line.recipientName,
      deliveryPointName: line.deliveryPointName,
      productName: line.productName,
      unit: line.unit,
      isFuel: fuel.has(line.productNo),
      expectedQuantity: Math.round(expected * 100) / 100,
      loadedQuantity: saved?.loadedQuantity ?? null,
      temperatureC: saved?.temperatureC ?? null,
      density: saved?.density ?? null,
      volume15L: saved?.volume15L ?? null
    }
  }
  let compartments: PickupCompartmentApi[]
  const plan = order.compartmentPlan
  if (plan && plan.compartments.length > 1) {
    // A line split over compartments shares its quantity in proportion of the volume placed.
    const placed = new Map<number, number>()
    for (const use of plan.uses) {
      for (const item of use.lines)
        placed.set(item.lineNo, (placed.get(item.lineNo) ?? 0) + item.volumeL)
    }
    compartments = plan.uses
      .filter((use) => use.lines.some((item) => lines.some((line) => line.lineNo === item.lineNo)))
      .map((use) => ({
        no: use.no,
        volumeL: use.volumeL,
        entries: use.lines
          .filter((item) => lines.some((line) => line.lineNo === item.lineNo))
          .map((item) => {
            const line = lines.find((l) => l.lineNo === item.lineNo)!
            const share =
              (placed.get(item.lineNo) ?? 0) > 0 ? item.volumeL / placed.get(item.lineNo)! : 1
            return entry(use.no, item.lineNo, line.quantity * share)
          })
      }))
  } else {
    compartments = [
      {
        no: 0,
        volumeL: plan?.compartments[0]?.volumeL ?? null,
        entries: lines.map((line) => entry(0, line.lineNo, line.quantity))
      }
    ]
  }
  const site = pickupSite(db, order.routeTemplateNo)
  return {
    orderNo: order.no,
    status: record.confirmedAt ? 'confirmed' : record.sentAt ? 'sent' : 'issued',
    orderStatus: order.status,
    plannedDeparture: order.plannedDeparture,
    pickupSiteName: site?.name ?? '',
    pickupSiteEmail: site?.email ?? '',
    vehiclePlate: order.means === 'carrier' ? order.carrierVehiclePlate : order.vehiclePlate,
    trailerPlate: order.trailerPlate,
    driverName: order.means === 'carrier' ? order.carrierDriverName : order.driverName,
    carrierName: order.carrierName,
    compartments,
    sentAt: record.sentAt,
    sentTo: record.sentTo,
    confirmedAt: record.confirmedAt,
    confirmedBy: record.confirmedBy,
    documentRef: record.documentRef
  }
}

/**
 * The loading list (TRS03-US06): in one space, the recipients in the reverse order of
 * delivery, the last delivered loaded first; when each compartment has its own access, by
 * compartment. A line out of the order is not on it.
 */
export function loadingListOf(db: MockDatabase, row: TransportOrderRow): LoadingListApi {
  const order = orderApi(db, row.no)
  const kept = order.lines.filter((line) =>
    stillToLoad(row.lines.find((r) => r.lineNo === line.lineNo)!)
  )
  const plan = order.compartmentPlan
  const lineOf = (lineNo: number) => {
    const line = kept.find((item) => item.lineNo === lineNo)!
    return {
      lineNo,
      recipientName: line.recipientName,
      deliveryPointName: line.deliveryPointName,
      productName: line.productName,
      unit: line.unit,
      quantity: line.quantity
    }
  }
  const compartmented = !!plan && plan.compartments.length > 1
  const groups = compartmented
    ? plan.uses
        .map((use) => ({
          title: String(use.no),
          compartmentNo: use.no,
          lines: use.lines
            .filter((item) => kept.some((line) => line.lineNo === item.lineNo))
            .map((item) => lineOf(item.lineNo))
        }))
        .filter((group) => group.lines.length)
    : [
        {
          title: '',
          compartmentNo: null,
          lines: [...kept].reverse().map((line) => lineOf(line.lineNo))
        }
      ]
  return {
    orderNo: order.no,
    plannedDeparture: order.plannedDeparture,
    vehiclePlate: order.means === 'carrier' ? order.carrierVehiclePlate : order.vehiclePlate,
    trailerPlate: order.trailerPlate,
    driverName: order.means === 'carrier' ? order.carrierDriverName : order.driverName,
    carrierName: order.carrierName,
    mode: compartmented ? 'compartments' : 'one_space',
    groups
  }
}

function event(
  row: TransportOrderRow,
  by: string,
  kind: 'pickup_sent' | 'pickup_confirmed',
  detail: string
) {
  return [...row.events, { at: nowIsoDateTime(), by, kind, detail }]
}

export function registerPickupHandlers(router: MockRouter, db: MockDatabase): void {
  const base = '/planning/transport-orders/:no'

  router.get(`${base}/pickup-note`, { feature: 'LOADING', action: 'read' }, (request) => {
    const note = pickupNoteOf(db, db.transportOrders.findOrFail(routeParam(request, 'no')))
    if (!note) throw conflict(PLANNING_MESSAGES.pickupNotIssued)
    return ok(note)
  })

  router.get(`${base}/loading-list`, { feature: 'TRANSPORTORDER', action: 'read' }, (request) =>
    ok(loadingListOf(db, db.transportOrders.findOrFail(routeParam(request, 'no'))))
  )

  /* The delivery manager sends the note to the pickup site by e-mail (TRS03-US03). */
  router.post(`${base}/pickup-note/send`, { feature: 'LOADING', action: 'update' }, (request) => {
    const row = db.transportOrders.findOrFail(routeParam(request, 'no'))
    const note = pickupNoteOf(db, row)
    if (!note) throw conflict(PLANNING_MESSAGES.pickupNotIssued)
    if (note.status === 'confirmed') throw conflict(PLANNING_MESSAGES.pickupConfirmed)
    const email = readString(readBody(request), 'email', { required: true })
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw invalidField('email')
    const user = sessionUser(request).code
    db.transportOrders.update(row.no, {
      pickup: { ...(row.pickup ?? EMPTY), sentAt: nowIsoDateTime(), sentTo: email },
      events: event(row, user, 'pickup_sent', email),
      ...stampModified(request)
    })
    return ok(pickupNoteOf(db, db.transportOrders.findOrFail(row.no)))
  })

  /* The pickup is confirmed with the site's document reference and, compartment by
   * compartment, the loaded quantity and the measures the product asks for (TRS03-US04). */
  router.post(
    `${base}/pickup-note/confirm`,
    { feature: 'LOADING', action: 'update' },
    (request) => {
      const row = db.transportOrders.findOrFail(routeParam(request, 'no'))
      const note = pickupNoteOf(db, row)
      if (!note) throw conflict(PLANNING_MESSAGES.pickupNotIssued)
      if (note.orderStatus !== 'confirmed') throw conflict(PLANNING_MESSAGES.loadingClosed)
      if (note.status === 'confirmed') throw conflict(PLANNING_MESSAGES.pickupConfirmed)
      const body = readBody(request)
      const documentRef = readString(body, 'documentRef', { required: true })
      const raw = body.entries
      if (!Array.isArray(raw)) throw invalidField('entries')
      const entries: PickupRecord['entries'] = []
      for (const compartment of note.compartments) {
        for (const expected of compartment.entries) {
          const given = raw.find(
            (item) =>
              item &&
              typeof item === 'object' &&
              (item as Record<string, unknown>).compartmentNo === compartment.no &&
              (item as Record<string, unknown>).lineNo === expected.lineNo
          ) as Record<string, unknown> | undefined
          if (!given) throw unprocessable(PLANNING_MESSAGES.loadingQuantityMissing)
          const loadedQuantity =
            readNumber(given, 'loadedQuantity', { required: true, min: 0 }) ?? 0
          const measure = (field: string, min: number, max: number) =>
            readNumber(given, field, { required: expected.isFuel, min, max })
          entries.push({
            compartmentNo: compartment.no,
            lineNo: expected.lineNo,
            loadedQuantity,
            temperatureC: expected.isFuel ? measure('temperatureC', -20, 60) : null,
            density: expected.isFuel ? measure('density', 0.5, 1.2) : null,
            volume15L: expected.isFuel ? measure('volume15L', 0, 100000) : null
          })
        }
      }
      // The loaded quantity of a line is the sum of its compartments.
      const loaded = new Map<number, number>()
      for (const item of entries)
        loaded.set(item.lineNo, (loaded.get(item.lineNo) ?? 0) + item.loadedQuantity)
      const user = sessionUser(request).code
      db.transportOrders.update(row.no, {
        lines: row.lines.map((line) =>
          loaded.has(line.lineNo) ? { ...line, loadedQuantity: loaded.get(line.lineNo)! } : line
        ),
        pickup: {
          ...(row.pickup ?? EMPTY),
          confirmedAt: nowIsoDateTime(),
          confirmedBy: user,
          documentRef,
          entries
        },
        events: event(row, user, 'pickup_confirmed', documentRef),
        ...stampModified(request)
      })
      return ok(pickupNoteOf(db, db.transportOrders.findOrFail(row.no)))
    }
  )
}
