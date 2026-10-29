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
import { compartmentPlan, goodsCarriers, serving, transportOrdersApi } from './transportOrders'
import { pointIssue } from '@/modules/planning/transport-orders/domain/transportOrder'
import {
  deliveryRequestStatus,
  requestLines
} from '@/modules/planning/delivery-requests/domain/deliveryRequest'
import { activeLinks, coupledWith } from '../fleet/links'
import { notifyDriver } from './notifications'
import { messageRecipients } from './recipientMessages'
import { planningSettings } from './settings'
import { toMockLanguage } from '../../i18n'
import type { MockRequest } from '../../http/types'

/** The mock has no warehouse system: the electronic link is shown as such on the note. */
const ELECTRONIC_CHANNEL = 'liaison électronique avec le système de l’entrepôt'

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
  const site = row.pickup?.siteNo
    ? db.sites.find(row.pickup.siteNo)
    : pickupSite(db, order.routeTemplateNo)
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
    documentRef: record.documentRef,
    pickupSiteNo: site?.no ?? '',
    deliveries: deliveriesOf(db, row)
  }
}

/** The deliveries of the order, each with its note state, for the operations on the notes. */
function deliveriesOf(db: MockDatabase, row: TransportOrderRow): PickupNoteApi['deliveries'] {
  const points = [...new Set(row.lines.map((line) => line.deliveryPointNo))]
  return points.map((pointNo) => {
    const lines = row.lines.filter((line) => line.deliveryPointNo === pointNo)
    const point = db.deliveryPoints.find(pointNo)
    const incident = lines.find((line) => line.incident)?.incident ?? null
    const active = lines.filter(stillToLoad)
    return {
      pointNo,
      deliveryPointName: point?.name ?? pointNo,
      recipientName: point ? (db.customers.find(point.customerNo)?.name ?? '') : '',
      products: lines
        .map((line) => db.products.find(line.productNo)?.name ?? line.productNo)
        .join(', '),
      state: active.length
        ? active.some((line) => line.declaredAt || line.refusalAt)
          ? 'done'
          : 'open'
        : incident?.kind === 'deviation'
          ? 'deviated'
          : incident?.kind === 'return'
            ? 'returned'
            : incident
              ? 'cancelled'
              : 'out',
      deviatedToRequestNo: incident?.deviatedToRequestNo ?? null
    }
  })
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
    const sendBody = readBody(request)
    // When the warehouse system is linked, the note goes to it electronically (TRS03-US03).
    const electronic = sendBody.electronic === true
    const email = electronic
      ? ELECTRONIC_CHANNEL
      : readString(sendBody, 'email', { required: true })
    if (!electronic && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw invalidField('email')
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

/* ---------------------------------------------------------------------------------------------
 * Operations on the notes once the plan is validated (TRS01-US24 to US26): they are the only
 * way to change it, and each one is traced in the order's history.
 * ------------------------------------------------------------------------------------------- */

interface IncidentLists {
  incidentTypes: { no: string; name: string; active?: boolean }[]
  reasonTypes: { no: string; name: string; active?: boolean }[]
  reasonCodes: { no: string; name: string; reasonTypeNo: string; active?: boolean }[]
}

/** The incident lists kept by the administrator in the planning settings (TRS07-US06). */
function incidentLists(db: MockDatabase): IncidentLists {
  const settings = planningSettings(db) as unknown as { incidents?: IncidentLists }
  return settings.incidents ?? { incidentTypes: [], reasonTypes: [], reasonCodes: [] }
}

function readIncident(db: MockDatabase, body: Record<string, unknown>) {
  const lists = incidentLists(db)
  const incidentTypeNo = readString(body, 'incidentTypeNo', { required: true })
  const reasonTypeNo = readString(body, 'reasonTypeNo', { required: true })
  const reasonCodeNo = readString(body, 'reasonCodeNo', { required: true })
  if (!lists.incidentTypes.some((item) => item.no === incidentTypeNo))
    throw invalidField('incidentTypeNo')
  if (!lists.reasonTypes.some((item) => item.no === reasonTypeNo))
    throw invalidField('reasonTypeNo')
  const code = lists.reasonCodes.find((item) => item.no === reasonCodeNo)
  if (!code || code.reasonTypeNo !== reasonTypeNo) throw invalidField('reasonCodeNo')
  return { incidentTypeNo, reasonTypeNo, reasonCodeNo, comment: readString(body, 'comment') }
}

/** The lines of one delivery still in the order. */
function deliveryLines(row: TransportOrderRow, pointNo: string) {
  return row.lines.filter((line) => line.deliveryPointNo === pointNo && stillToLoad(line))
}

const OPERATION_STATUSES = ['planned', 'confirmed', 'ready', 'in_progress']

function releaseRequests(
  db: MockDatabase,
  requestNos: readonly (string | null)[],
  request: MockRequest
) {
  for (const no of requestNos) {
    if (!no) continue
    if (db.deliveryRequests.find(no)) {
      db.deliveryRequests.update(no, { transportOrderNo: null, ...stampModified(request) })
    }
  }
}

export function registerPickupOperations(router: MockRouter, db: MockDatabase): void {
  const base = '/planning/transport-orders/:no'

  /* A linked warehouse system confirms the loading itself (TRS03-US02): the mock answers in its
   * place with the expected quantities, the reference measures and its own document number. */
  router.post(
    `${base}/pickup-note/system-confirm`,
    { feature: 'LOADING', action: 'update' },
    (request) => {
      const row = db.transportOrders.findOrFail(routeParam(request, 'no'))
      const note = pickupNoteOf(db, row)
      if (!note) throw conflict(PLANNING_MESSAGES.pickupNotIssued)
      if (note.orderStatus !== 'confirmed') throw conflict(PLANNING_MESSAGES.loadingClosed)
      if (note.status === 'confirmed') throw conflict(PLANNING_MESSAGES.pickupConfirmed)
      if ((row.pickup?.sentTo ?? '') !== ELECTRONIC_CHANNEL)
        throw conflict(PLANNING_MESSAGES.pickupNotLinked)
      const entries = note.compartments.flatMap((compartment) =>
        compartment.entries.map((entry) => {
          const product = db.products.all().find((item) => item.name === entry.productName)
          return {
            compartmentNo: compartment.no,
            lineNo: entry.lineNo,
            loadedQuantity: entry.expectedQuantity,
            temperatureC: entry.isFuel ? 15 : null,
            density: entry.isFuel ? (product?.referenceDensity ?? 0.84) : null,
            volume15L: entry.isFuel ? entry.expectedQuantity : null
          }
        })
      )
      const loaded = new Map<number, number>()
      for (const item of entries)
        loaded.set(item.lineNo, (loaded.get(item.lineNo) ?? 0) + item.loadedQuantity)
      const documentRef = `SYS-${row.no}`
      db.transportOrders.update(row.no, {
        lines: row.lines.map((line) =>
          loaded.has(line.lineNo) ? { ...line, loadedQuantity: loaded.get(line.lineNo)! } : line
        ),
        pickup: {
          ...(row.pickup ?? EMPTY),
          confirmedAt: nowIsoDateTime(),
          confirmedBy: 'système de l’entrepôt',
          documentRef,
          entries
        },
        events: [
          ...row.events,
          {
            at: nowIsoDateTime(),
            by: 'système de l’entrepôt',
            kind: 'pickup_confirmed',
            detail: documentRef
          }
        ],
        ...stampModified(request)
      })
      return ok(pickupNoteOf(db, db.transportOrders.findOrFail(row.no)))
    }
  )

  router.get(`${base}/pickup-note/incident-lists`, { feature: 'LOADING', action: 'read' }, () =>
    ok(incidentLists(db))
  )

  /* Choosing another vehicle fills in its driver, his licence and the carrier (TRS01-US24). */
  router.get(
    `${base}/pickup-note/vehicle-candidate`,
    { feature: 'LOADING', action: 'read' },
    (request) => {
      const vehicleNo = String(request.query?.vehicleNo ?? '')
      const vehicle = db.vehicles.find(vehicleNo)
      if (!vehicle) throw invalidField('vehicleNo')
      const assignment = activeLinks(db).assignmentByVehicle.get(vehicleNo)
      const employee = assignment ? db.employees.find(assignment.employeeNo) : undefined
      const licence = employee
        ? db.documents
            .all()
            .find(
              (doc) =>
                doc.subjectNo === employee.no &&
                doc.documentTypeNo === 'PER-LIC' &&
                !doc.replacedByNo
            )
        : undefined
      const coupling = activeLinks(db).couplingByVehicle.get(vehicleNo)
      return ok({
        vehicleNo,
        plate: vehicle.plate,
        trailerNo: coupling ? coupledWith(coupling, vehicleNo) : null,
        driverNo: employee?.no ?? null,
        driverName: employee ? `${employee.firstName} ${employee.lastName}` : '',
        licenceNo: licence?.number ?? '',
        licenceExpiry: licence?.expiryDate ?? null,
        carrierName: vehicle.acquisitionProviderNo
          ? (db.providers.find(vehicle.acquisitionProviderNo)?.name ?? '')
          : ''
      })
    }
  )

  /* The new vehicle must carry the same plan (compartments, capacities, rules, equipment),
   * otherwise the change is refused with the reason; the drivers are told (TRS01-US24). It is
   * also how another vehicle takes over after a breakdown on the road (TRS01-US18). */
  router.post(
    `${base}/pickup-note/change-vehicle`,
    { feature: 'LOADING', action: 'update' },
    (request) => {
      const row = db.transportOrders.findOrFail(routeParam(request, 'no'))
      const order = orderApi(db, row.no)
      if (order.means !== 'fleet' || !row.tripNo) throw conflict(PLANNING_MESSAGES.pickupFleetOnly)
      if (!OPERATION_STATUSES.includes(order.status))
        throw conflict(PLANNING_MESSAGES.pickupNotIssued)
      const body = readBody(request)
      const vehicleNo = readString(body, 'vehicleNo', { required: true })
      const trailerNo = readString(body, 'trailerNo') || null
      const driverNo = readString(body, 'driverNo', { required: true })
      if (!db.vehicles.find(vehicleNo) || (trailerNo && !db.vehicles.find(trailerNo))) {
        throw invalidField('vehicleNo')
      }
      if (!db.employees.find(driverNo)) throw invalidField('driverNo')
      const kept = row.lines.filter(stillToLoad)
      const reason = planRefusal(db, kept, vehicleNo, trailerNo, toMockLanguage(request.language))
      if (reason) throw unprocessable({ fr: reason.fr, en: reason.en })
      const trip = db.trips.findOrFail(row.tripNo)
      const previousDriver = trip.driverNo
      db.trips.update(trip.no, { vehicleNo, trailerNo, driverNo, ...stampModified(request) })
      const plate = db.vehicles.find(trailerNo ?? vehicleNo)?.plate ?? vehicleNo
      db.transportOrders.update(row.no, {
        events: [
          ...row.events,
          {
            at: nowIsoDateTime(),
            by: sessionUser(request).code,
            kind: 'pickup_vehicle_changed',
            detail: plate
          }
        ],
        ...stampModified(request)
      })
      if (previousDriver !== driverNo) {
        notifyDriver(db, previousDriver, 'order_withdrawn', row.no)
        notifyDriver(db, driverNo, 'order_assigned', row.no)
      }
      return ok(pickupNoteOf(db, db.transportOrders.findOrFail(row.no)))
    }
  )

  /* The pickup site changes as long as the pickup is not confirmed (TRS01-US24). */
  router.post(
    `${base}/pickup-note/change-site`,
    { feature: 'LOADING', action: 'update' },
    (request) => {
      const row = db.transportOrders.findOrFail(routeParam(request, 'no'))
      const note = pickupNoteOf(db, row)
      if (!note) throw conflict(PLANNING_MESSAGES.pickupNotIssued)
      if (note.status === 'confirmed') throw conflict(PLANNING_MESSAGES.pickupConfirmed)
      const siteNo = readString(readBody(request), 'siteNo', { required: true })
      const site = db.sites.find(siteNo)
      if (!site) throw invalidField('siteNo')
      db.transportOrders.update(row.no, {
        pickup: { ...(row.pickup ?? EMPTY), siteNo, sentAt: null, sentTo: '' },
        events: [
          ...row.events,
          {
            at: nowIsoDateTime(),
            by: sessionUser(request).code,
            kind: 'pickup_site_changed',
            detail: site.name
          }
        ],
        ...stampModified(request)
      })
      return ok(pickupNoteOf(db, db.transportOrders.findOrFail(row.no)))
    }
  )

  /* A delivery note is cancelled through an incident (type, reason type, reason code): the
   * note is archived as cancelled, its order is free again, and before loading its compartment
   * is not loaded, since the pickup note leaves it out (TRS01-US25). */
  router.post(
    `${base}/points/:pointNo/cancel`,
    { feature: 'LOADING', action: 'update' },
    (request) => {
      const row = db.transportOrders.findOrFail(routeParam(request, 'no'))
      if (!OPERATION_STATUSES.includes(orderApi(db, row.no).status))
        throw conflict(PLANNING_MESSAGES.pickupNotIssued)
      const pointNo = routeParam(request, 'pointNo')
      const lines = deliveryLines(row, pointNo).filter(
        (line) => !line.declaredAt && !line.refusalAt
      )
      if (!lines.length) throw conflict(PLANNING_MESSAGES.executionLineSettled)
      const incident = readIncident(db, readBody(request))
      const at = nowIsoDateTime()
      const by = sessionUser(request).code
      const ids = new Set(lines.map((line) => line.lineNo))
      db.transportOrders.update(row.no, {
        lines: row.lines.map((line) =>
          ids.has(line.lineNo)
            ? {
                ...line,
                incident: {
                  kind: 'cancellation' as const,
                  at,
                  by,
                  ...incident,
                  deviatedToRequestNo: null
                },
                // Loaded goods go back to the depot.
                returnedAt: line.conformingAt || line.loadedQuantity !== null ? at : line.returnedAt
              }
            : line
        ),
        events: [...row.events, { at, by, kind: 'note_cancelled', detail: pointNo }],
        ...stampModified(request)
      })
      releaseRequests(
        db,
        lines.map((line) => line.deliveryRequestNo),
        request
      )
      return ok(pickupNoteOf(db, db.transportOrders.findOrFail(row.no)))
    }
  )

  /* The orders a delivery could be deviated to: a recipient waiting for the same product, for a
   * quantity the loaded compartment covers (TRS01-US26). */
  router.get(
    `${base}/points/:pointNo/deviation-candidates`,
    { feature: 'LOADING', action: 'read' },
    (request) => {
      const row = db.transportOrders.findOrFail(routeParam(request, 'no'))
      return ok(deviationCandidates(db, row, routeParam(request, 'pointNo')))
    }
  )

  /* Deviating closes the original note by a « deviation » incident, makes a new delivery for
   * the new recipient, who is notified, and frees the original order; with no deviation
   * possible, the goods go back to the depot (TRS01-US26). */
  router.post(
    `${base}/points/:pointNo/deviate`,
    { feature: 'LOADING', action: 'update' },
    (request) => {
      const row = db.transportOrders.findOrFail(routeParam(request, 'no'))
      if (!OPERATION_STATUSES.includes(orderApi(db, row.no).status))
        throw conflict(PLANNING_MESSAGES.pickupNotIssued)
      const pointNo = routeParam(request, 'pointNo')
      const lines = deliveryLines(row, pointNo).filter(
        (line) => !line.declaredAt && !line.refusalAt
      )
      if (!lines.length) throw conflict(PLANNING_MESSAGES.executionLineSettled)
      const body = readBody(request)
      const incident = readIncident(db, body)
      const toDepot = body.toDepot === true
      const at = nowIsoDateTime()
      const by = sessionUser(request).code
      const ids = new Set(lines.map((line) => line.lineNo))
      let added: TransportOrderRow['lines'] = []
      let targetNo: string | null = null
      if (!toDepot) {
        targetNo = readString(body, 'requestNo', { required: true })
        const candidate = deviationCandidates(db, row, pointNo).find(
          (item) => item.requestNo === targetNo
        )
        if (!candidate) throw unprocessable(PLANNING_MESSAGES.pickupDeviationRefused)
        const target = db.deliveryRequests.findOrFail(targetNo)
        const source = lines.find((line) => line.productNo === candidate.productNo)!
        const nextNo = Math.max(...row.lines.map((line) => line.lineNo)) + 1
        added = [
          {
            ...source,
            lineNo: nextNo,
            deliveryRequestNo: target.no,
            requestLineNo: 1,
            deliveryPointNo: target.deliveryPointNo,
            quantity: candidate.quantity,
            loadedQuantity: candidate.quantity,
            weightKg: target.weightKg,
            incident: null,
            returnedAt: null,
            confirmedAt: at,
            confirmedBy: 'déviation',
            trackingToken: `dev${row.no}${nextNo}`
              .replace(/[^a-z0-9]/gi, '')
              .toLowerCase()
              .padEnd(32, '0'),
            recipientMessages: []
          }
        ]
      }
      db.transportOrders.update(row.no, {
        lines: [
          ...row.lines.map((line) =>
            ids.has(line.lineNo)
              ? {
                  ...line,
                  incident: {
                    kind: toDepot ? ('return' as const) : ('deviation' as const),
                    at,
                    by,
                    ...incident,
                    deviatedToRequestNo: targetNo
                  },
                  returnedAt: toDepot ? at : line.returnedAt
                }
              : line
          ),
          ...added
        ],
        events: [...row.events, { at, by, kind: 'note_deviated', detail: targetNo ?? 'dépôt' }],
        ...stampModified(request)
      })
      releaseRequests(
        db,
        lines.map((line) => line.deliveryRequestNo),
        request
      )
      if (targetNo) {
        db.deliveryRequests.update(targetNo, {
          transportOrderNo: row.no,
          ...stampModified(request)
        })
        messageRecipients(db, row.no, 'planned', (line) => line.deliveryRequestNo === targetNo)
      }
      return ok(pickupNoteOf(db, db.transportOrders.findOrFail(row.no)))
    }
  )
}

function deviationCandidates(db: MockDatabase, row: TransportOrderRow, pointNo: string) {
  const lines = deliveryLines(row, pointNo).filter((line) => !line.declaredAt && !line.refusalAt)
  const loaded = new Map<string, number>()
  for (const line of lines) {
    loaded.set(
      line.productNo,
      (loaded.get(line.productNo) ?? 0) + (line.loadedQuantity ?? line.quantity)
    )
  }
  const today = new Date().toISOString().slice(0, 10)
  return db.deliveryRequests
    .all()
    .filter((request) => deliveryRequestStatus(request, today) === 'pending')
    .flatMap((request) => {
      const reqLines = requestLines(request)
      if (reqLines.length !== 1) return []
      const [only] = reqLines
      const room = loaded.get(only!.productNo)
      if (room === undefined || only!.quantity > room) return []
      const point = db.deliveryPoints.find(request.deliveryPointNo)
      return [
        {
          requestNo: request.no,
          recipientName: point ? (db.customers.find(point.customerNo)?.name ?? '') : '',
          deliveryPointName: point?.name ?? '',
          productNo: only!.productNo,
          productName: db.products.find(only!.productNo)?.name ?? only!.productNo,
          quantity: only!.quantity
        }
      ]
    })
}

/** Why a combination cannot carry the lines of the plan, or null. */
function planRefusal(
  db: MockDatabase,
  lines: TransportOrderRow['lines'],
  vehicleNo: string,
  trailerNo: string | null,
  language: 'fr' | 'en'
): { fr: string; en: string } | null {
  if (!goodsCarriers(db, vehicleNo, trailerNo).length) {
    return { fr: 'Ce véhicule ne porte pas de marchandise.', en: 'This vehicle carries no goods.' }
  }
  const plan = compartmentPlan(db, lines, vehicleNo, trailerNo)
  const noRoom = plan?.issues.find((issue) => issue.code === 'noRoom')
  if (noRoom && noRoom.code === 'noRoom') {
    return {
      fr: `Le nouveau véhicule ne peut pas porter le plan : pas de place pour ${noRoom.productName} (capacité ou règle d'un compartiment).`,
      en: `The new vehicle cannot carry the plan: no room for ${noRoom.productName} (capacity or compartment rule).`
    }
  }
  const served = serving(db, vehicleNo, trailerNo)
  for (const line of lines) {
    const point = db.deliveryPoints.find(line.deliveryPointNo)
    if (!point) continue
    const issue = pointIssue(
      [
        {
          name: point.name,
          pumpRequired: point.pumpRequired,
          acceptedVehicleTypeNos: point.acceptedVehicleTypeNos
        }
      ],
      served.typeNo,
      served.hasPump
    )
    if (issue) {
      return issue.code === 'pumpRequired'
        ? {
            fr: `Équipement manquant : ${point.name} demande une pompe.`,
            en: `Missing equipment: ${point.name} needs a pump.`
          }
        : {
            fr: `${point.name} n'accepte pas ce type de véhicule.`,
            en: `${point.name} does not accept this vehicle type.`
          }
    }
  }
  void language
  return null
}
