import { plannedSchedule } from '@/modules/fleet/route-templates/domain/routeTemplate'
import { deviationNature } from '@/modules/fleet/route-deviations/domain/routeDeviation'
import { linesDelivered } from '@/modules/planning/execution/domain/execution'
import {
  firstArrivalMarked,
  linesConfirmed
} from '@/modules/planning/customer-confirmations/domain/confirmation'
import { protestStatus, qualityFacts } from '@/modules/planning/delivery-quality/domain/quality'
import { loadingReady } from '@/modules/planning/loading/domain/loading'
import {
  closingBlocks,
  debriefingIssue,
  dossierComplete,
  gainLossText,
  requiredDocumentKinds,
  type DebriefingCompartment,
  type DossierPieceKind,
  type DossierPieceState,
  type OrderDebriefing
} from '@/modules/planning/closing/domain/closing'
import { transportOrderStatus } from '@/modules/planning/transport-orders/domain/transportOrder'
import type { TransportOrderApi } from '@/modules/planning/transport-orders/types/transportOrder.types'
import { delayMinutes } from '@/modules/planning/reports/domain/indicators'
import { nowIsoDateTime, todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import type {
  TransportOrderLineRow,
  TransportOrderRow
} from '../../fixtures/planning/transportOrders'
import { readBody, routeParam, stampModified } from '../../http/crudResource'
import { conflict, notFound, unprocessable } from '../../http/errors'
import { invalidField, readString } from '../../http/input'
import { requireReference } from '../../http/references'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser, type MockRequest } from '../../http/types'
import { fileMetaOf } from '../files'
import { deliveryNotesOf } from './deliveryNotes'
import { PLANNING_MESSAGES } from './messages'
import { plannedAtPoint } from './reports'
import { planningSettings } from './settings'
import { transportOrdersApi } from './transportOrders'

const FEATURE = 'TRANSPORTORDER'
const KIND = /^[a-z0-9_]{1,40}$/
const PLANNED_STATUSES = ['planned', 'confirmed', 'ready', 'in_progress', 'completed']

function delivered(db: MockDatabase, order: TransportOrderRow): boolean {
  const trip = order.tripNo ? db.trips.find(order.tripNo) : undefined
  const fleetDeparted = !!trip && ['in_progress', 'completed', 'closed'].includes(trip.status)
  return (
    transportOrderStatus({
      cancelledAt: order.cancelledAt,
      closedAt: order.closedAt,
      means: order.means,
      tripStatus: trip?.status ?? null,
      linesConfirmed: linesConfirmed(order.lines),
      firstArrival: firstArrivalMarked(order.lines),
      loadingReady: loadingReady(order.lines),
      carrierDeparted: order.carrierDepartedAt !== null || fleetDeparted,
      linesDelivered: linesDelivered(order.lines)
    }) === 'in_progress' && linesDelivered(order.lines)
  )
}

function blocksOf(db: MockDatabase, order: TransportOrderRow) {
  return closingBlocks({
    delivered: delivered(db, order),
    lines: order.lines,
    today: todayIso(),
    tacitDays: planningSettings(db).confirmation.tacitConfirmationDays,
    documentKinds: order.documents.map((document) => document.kind),
    requiredKinds: requiredDocumentKinds(planningSettings(db).closing.requiredDocuments)
  })
}

function vehicleOf(
  db: MockDatabase,
  order: TransportOrderRow
): { vehicle: string; trailer: string } {
  if (order.means === 'carrier') return { vehicle: order.carrierVehiclePlate, trailer: '' }
  const trip = order.tripNo ? db.trips.find(order.tripNo) : undefined
  const plate = (no: string | null | undefined) => (no ? (db.vehicles.find(no)?.plate ?? '') : '')
  return { vehicle: plate(trip?.vehicleNo), trailer: plate(trip?.trailerNo) }
}

function placesOf(db: MockDatabase, order: TransportOrderRow): string {
  return order.lines
    .map((line) => db.deliveryPoints.find(line.deliveryPointNo)?.name ?? '')
    .filter((name, index, names) => name && names.indexOf(name) === index)
    .join('; ')
}

function orderView(db: MockDatabase, no: string): TransportOrderApi {
  const order = transportOrdersApi(db).find((item) => item.no === no)
  if (!order) throw notFound()
  return order
}

/**
 * The compartments of the fiche (TRS05-US05): what the depot loaded in each, from the pickup
 * data; before that, the compartment plan; one space when the vehicle has none.
 */
function compartmentsOf(
  order: TransportOrderRow,
  view: TransportOrderApi
): DebriefingCompartment[] {
  const productOf = (lineNo: number) => {
    const line = view.lines.find((item) => item.lineNo === lineNo)
    return { name: line?.productName ?? '', unit: line?.unit ?? '' }
  }
  const join = (values: string[]) => [...new Set(values.filter(Boolean))].join(', ')
  const entries = order.pickup?.entries ?? []
  if (order.pickup?.confirmedAt && entries.length) {
    const numbers = [...new Set(entries.map((entry) => entry.compartmentNo))].sort((a, b) => a - b)
    return numbers.map((no) => {
      const own = entries.filter((entry) => entry.compartmentNo === no)
      const units = new Set(own.map((entry) => productOf(entry.lineNo).unit))
      return {
        no,
        productName: join(own.map((entry) => productOf(entry.lineNo).name)),
        unit: units.size === 1 ? [...units][0]! : '',
        quantity: own.reduce((sum, entry) => sum + entry.loadedQuantity, 0)
      }
    })
  }
  const plan = view.compartmentPlan
  if (plan && plan.compartments.length > 1) {
    return plan.uses
      .filter((use) => use.lines.length)
      .map((use) => ({
        no: use.no,
        productName: join(use.lines.map((item) => item.productName)),
        unit: 'L',
        quantity: use.usedL
      }))
  }
  const units = new Set(view.lines.map((line) => line.unit))
  return [
    {
      no: 0,
      productName: join(view.lines.map((line) => line.productName)),
      unit: units.size === 1 ? [...units][0]! : '',
      quantity:
        units.size === 1
          ? view.lines.reduce((sum, line) => sum + (line.loadedQuantity ?? line.quantity), 0)
          : null
    }
  ]
}

function gapsOf(view: TransportOrderApi, order: TransportOrderRow) {
  return order.lines
    .filter((line) => line.quantityGap !== null && line.quantityGap !== 0)
    .map((line) => {
      const shown = view.lines.find((item) => item.lineNo === line.lineNo)
      return {
        lineNo: line.lineNo,
        productName: shown?.productName ?? '',
        unit: shown?.unit ?? '',
        gap: line.quantityGap ?? 0,
        qualification: line.gapQualification,
        imputableToDriver: line.gapQualification ? (line.gapImputableToDriver ?? null) : null
      }
    })
}

type IncidentKind =
  | ReturnType<typeof qualityFacts>[number]
  | 'postponement'
  | 'route_deviation'
  | 'cancellation'

/** What went wrong on the order: facts of the lines, deviations of the trip, a cancellation. */
function incidentsOf(db: MockDatabase, order: TransportOrderRow, view: TransportOrderApi) {
  const rows: { kind: IncidentKind; lineNo: number | null; at: string | null; detail: string }[] =
    []
  const reason = (no: string | null | undefined) => (no && db.planningReasons.find(no)?.name) || ''
  for (const line of order.lines) {
    const shown = view.lines.find((item) => item.lineNo === line.lineNo)
    const label = [shown?.recipientName, shown?.productName].filter(Boolean).join(' · ')
    for (const fact of qualityFacts(line)) {
      if (fact === 'protest') continue
      const at =
        fact === 'loading_nonconformity'
          ? line.nonconformityAt
          : fact === 'refusal'
            ? line.refusalAt
            : fact === 'contestation'
              ? line.receptionContestedAt
              : line.declaredAt
      const detail =
        fact === 'loading_nonconformity'
          ? reason(line.nonconformityReasonNo)
          : fact === 'refusal'
            ? reason(line.refusalReasonNo)
            : fact === 'contestation'
              ? reason(line.contestReasonNo)
              : fact === 'quantity_gap'
                ? String(line.quantityGap)
                : ''
      rows.push({
        kind: fact,
        lineNo: line.lineNo,
        at,
        detail: [label, detail].filter(Boolean).join(' · ')
      })
    }
    if (line.postponedAt)
      rows.push({
        kind: 'postponement',
        lineNo: line.lineNo,
        at: line.postponedAt,
        detail: [label, reason(line.postponementReasonNo)].filter(Boolean).join(' · ')
      })
    for (const note of line.protests)
      rows.push({
        kind: 'protest',
        lineNo: line.lineNo,
        at: note.preparedAt,
        detail: `${note.no} · ${reason(note.reasonNo)}`
      })
  }
  if (order.tripNo) {
    for (const deviation of db.routeDeviations.all()) {
      if (deviation.tripNo !== order.tripNo) continue
      rows.push({
        kind: 'route_deviation',
        lineNo: null,
        at: deviation.detectedAt,
        detail: [
          db.deviationTypes.find(deviation.deviationTypeNo)?.name ?? deviation.deviationTypeNo,
          deviation.location
        ]
          .filter(Boolean)
          .join(' · ')
      })
    }
  }
  if (order.cancelledAt)
    rows.push({
      kind: 'cancellation',
      lineNo: null,
      at: order.cancelledAt,
      detail: reason(order.cancellationReasonNo)
    })
  return rows.sort((left, right) => (left.at ?? '').localeCompare(right.at ?? ''))
}

interface DossierPiece {
  kind: DossierPieceKind
  state: DossierPieceState
  reference: string
  at: string | null
  /** A file filed on the order for this piece, when there is one. */
  fileNo: string | null
  /** For the delivery notes: the recipient of each one. */
  label: string
  fuel: boolean
}

/**
 * The documentary dossier of the order, put together on its own (TRS05-US04): the order, the
 * pickup note, the document handed over by the depot (the BSL for fuel), the signed delivery
 * notes, the loading list, the incidents and the debriefing fiche.
 */
export function documentaryDossier(db: MockDatabase, order: TransportOrderRow) {
  const view = orderView(db, order.no)
  const planned = !!order.means && PLANNED_STATUSES.includes(view.status)
  const fuel = order.lines.some((line) => db.products.find(line.productNo)?.isFuel)
  const filed = (kind: string) =>
    order.documents.find((document) => document.kind === kind)?.fileNo ?? null
  const piece = (
    kind: DossierPieceKind,
    state: DossierPieceState,
    extra: Partial<DossierPiece> = {}
  ): DossierPiece => ({
    kind,
    state,
    reference: '',
    at: null,
    fileNo: null,
    label: '',
    fuel,
    ...extra
  })
  const pickup = order.pickup
  const incidents = incidentsOf(db, order, view)
  const notes = deliveryNotesOf(db, order).filter((note) => note.state !== 'planned')
  const pieces: DossierPiece[] = [
    piece('transport_order', 'available', { reference: order.no, at: order.createdAt }),
    piece('pickup_note', !planned ? 'missing' : pickup?.confirmedAt ? 'available' : 'pending', {
      reference: planned ? order.no : '',
      at: pickup?.confirmedAt ?? pickup?.sentAt ?? null
    }),
    piece(
      'depot_document',
      pickup?.documentRef || filed('bsl') || filed('depot_document') ? 'available' : 'missing',
      {
        reference: pickup?.documentRef ?? '',
        at: pickup?.confirmedAt ?? null,
        fileNo: filed('bsl') ?? filed('depot_document')
      }
    ),
    ...(notes.length
      ? notes.map((note) =>
          piece('delivery_note', note.state === 'signed' ? 'available' : 'pending', {
            reference: note.deliveryPointName,
            label: note.recipientName,
            at: note.signedAt ?? note.openedAt,
            fileNo: filed('delivery_note')
          })
        )
      : [piece('delivery_note', 'missing', { fileNo: filed('delivery_note') })]),
    piece('loading_list', planned || filed('loading_list') ? 'available' : 'missing', {
      reference: planned ? order.no : '',
      fileNo: filed('loading_list')
    }),
    piece('incidents', 'available', { reference: String(incidents.length) }),
    piece('debriefing', order.debriefing ? 'available' : 'missing', {
      reference: order.debriefing?.voucherNo ?? '',
      at: order.debriefing?.savedAt ?? null
    })
  ]
  const known = new Set(['bsl', 'depot_document', 'delivery_note', 'loading_list'])
  return {
    pieces: pieces.map((item) => ({
      ...item,
      file: item.fileNo ? fileMetaOf(db, item.fileNo) : null
    })),
    complete: dossierComplete(pieces),
    incidents,
    documents: order.documents
      .filter((document) => !known.has(document.kind))
      .map((document) => ({ ...document, file: fileMetaOf(db, document.fileNo) }))
  }
}

function save(
  db: MockDatabase,
  order: TransportOrderRow,
  patch: Partial<TransportOrderRow>,
  request: MockRequest,
  detail: string
): void {
  db.transportOrders.update(order.no, {
    ...patch,
    events: [
      ...order.events,
      { at: nowIsoDateTime(), by: sessionUser(request).code, kind: 'closed', detail }
    ],
    ...stampModified(request)
  })
}

export function closingApi(db: MockDatabase, order: TransportOrderRow) {
  const means = vehicleOf(db, order)
  const view = orderView(db, order.no)
  return {
    blocks: blocksOf(db, order),
    requiredDocuments: requiredDocumentKinds(planningSettings(db).closing.requiredDocuments),
    documents: order.documents.map((document) => ({
      ...document,
      file: fileMetaOf(db, document.fileNo)
    })),
    debriefing: order.debriefing,
    derived: {
      ...means,
      places: placesOf(db, order),
      gainLoss: gainLossText(order.lines),
      gaps: gapsOf(view, order),
      compartments: compartmentsOf(order, view)
    },
    dossier: documentaryDossier(db, order)
  }
}

type Outcome =
  | 'pending'
  | 'not_loaded'
  | 'delivered'
  | 'partial'
  | 'refused'
  | 'postponed'
  | 'returned'

function outcomeOf(line: TransportOrderLineRow): Outcome {
  if (line.returnedAt) return 'returned'
  if (line.refusalAt) return 'refused'
  if (line.postponedAt) return 'postponed'
  if (line.declaredAt) {
    const reference = line.loadedQuantity ?? line.quantity
    return line.receivedQuantity !== null && line.receivedQuantity < reference
      ? 'partial'
      : 'delivered'
  }
  if (line.nonconformityAt) return 'not_loaded'
  return 'pending'
}

/** The route plan: each stop with its planned time and, once passed, the time it was passed. */
function routePlanOf(db: MockDatabase, view: TransportOrderApi) {
  const margin = planningSettings(db).schedule.lateMarginMin
  const trip = view.tripNo ? db.trips.find(view.tripNo) : undefined
  const route = view.routeTemplateNo ? db.routeTemplates.find(view.routeTemplateNo) : undefined
  const stops = trip?.stops ?? route?.stops ?? []
  const start = trip?.plannedDeparture ?? view.plannedDeparture
  const schedule = start ? plannedSchedule(start, stops) : []
  return stops.map((stop, index) => {
    const passedAt = trip?.stops[index]?.passedAt ?? null
    const plannedAt = schedule[index] ?? null
    return {
      siteNo: stop.siteNo,
      siteName: db.sites.find(stop.siteNo)?.name ?? stop.siteNo,
      role: stop.role,
      plannedAt,
      passedAt,
      late: !!passedAt && !!plannedAt && delayMinutes(passedAt, plannedAt) > margin
    }
  })
}

/**
 * The complete file of an order in one place (TRS02-US07): the order, its assignment, the
 * route plan, the progress point by point, the goods and their gaps, the conformity of the
 * trip and the documents.
 */
export function orderDossierApi(db: MockDatabase, order: TransportOrderRow) {
  const view = orderView(db, order.no)
  const routePlan = routePlanOf(db, view)
  const points = [...new Set(order.lines.map((line) => line.deliveryPointNo))]
  const progress = points.map((pointNo) => {
    const lines = order.lines.filter((line) => line.deliveryPointNo === pointNo)
    const shown = view.lines.find((line) => line.deliveryPointNo === pointNo)
    const first = (pick: (line: TransportOrderLineRow) => string | null) =>
      lines
        .map(pick)
        .filter((at): at is string => !!at)
        .sort()[0] ?? null
    return {
      deliveryPointNo: pointNo,
      deliveryPointName: shown?.deliveryPointName ?? '',
      recipientName: shown?.recipientName ?? '',
      plannedAt: plannedAtPoint(db, view, pointNo),
      arrivedAt: first((line) => line.arrivedAt),
      declaredAt: first((line) => line.declaredAt),
      confirmedAt: first((line) => line.receptionConfirmedAt),
      contestedAt: first((line) => line.receptionContestedAt),
      lines: lines.map((line) => line.lineNo)
    }
  })
  const goods = order.lines.map((line) => {
    const shown = view.lines.find((item) => item.lineNo === line.lineNo)
    return {
      lineNo: line.lineNo,
      deliveryPointName: shown?.deliveryPointName ?? '',
      productName: shown?.productName ?? '',
      unit: shown?.unit ?? '',
      quantity: line.quantity,
      loadedQuantity: line.loadedQuantity,
      receivedQuantity: line.receivedQuantity,
      quantityGap: line.quantityGap,
      gapQualification: line.gapQualification,
      outcome: outcomeOf(line),
      protests: line.protests.map((note) => ({ no: note.no, status: protestStatus(note) }))
    }
  })
  const deviations = order.tripNo
    ? db.routeDeviations
        .all()
        .filter((deviation) => deviation.tripNo === order.tripNo)
        .map((deviation) => ({
          no: deviation.no,
          typeName:
            db.deviationTypes.find(deviation.deviationTypeNo)?.name ?? deviation.deviationTypeNo,
          detectedAt: deviation.detectedAt,
          location: deviation.location,
          nature: deviationNature(deviation.qualification)
        }))
    : []
  const tracked = order.means === 'fleet' && !!order.tripNo
  const passed = routePlan.filter((stop) => stop.passedAt)
  return {
    order: view,
    routePlan,
    progress,
    goods,
    compliance: {
      /** A subcontracted order has no trip followed by the fleet: nothing to compare. */
      tracked,
      stopsPassed: passed.length,
      stopsTotal: routePlan.length,
      lateStops: passed.filter((stop) => stop.late).length,
      deviations,
      toQualify: deviations.filter((item) => item.nature === 'to_qualify').length,
      unjustified: deviations.filter((item) => item.nature === 'unjustified').length,
      compliant: tracked
        ? deviations.every((item) => item.nature !== 'unjustified' && item.nature !== 'to_qualify')
        : null
    },
    debriefing: order.debriefing,
    dossier: documentaryDossier(db, order)
  }
}

export function registerClosingHandlers(router: MockRouter, db: MockDatabase): void {
  router.get(
    '/planning/transport-orders/:no/closing',
    { feature: FEATURE, action: 'read' },
    (request) => ok(closingApi(db, db.transportOrders.findOrFail(routeParam(request, 'no'))))
  )

  router.get(
    '/planning/transport-orders/:no/dossier',
    /* The delivery manager consults the complete file (TRS02-US07). */
    { feature: 'DELIVERYQUALITY', action: 'read' },
    (request) => ok(orderDossierApi(db, db.transportOrders.findOrFail(routeParam(request, 'no'))))
  )

  router.post(
    '/planning/transport-orders/:no/documents',
    { feature: 'DELIVERYQUALITY', action: 'execute' },
    (request) => {
      const order = db.transportOrders.findOrFail(routeParam(request, 'no'))
      if (order.closedAt) throw conflict(PLANNING_MESSAGES.closingDone)
      const body = readBody(request)
      const kind = readString(body, 'kind', { required: true }).toLowerCase()
      if (!KIND.test(kind)) throw invalidField('kind')
      const fileNo = requireReference(db.files, body, 'fileNo')
      if (order.documents.some((document) => document.kind === kind)) {
        throw conflict(PLANNING_MESSAGES.closingDocumentTaken)
      }
      db.transportOrders.update(order.no, {
        documents: [...order.documents, { kind, fileNo }],
        ...stampModified(request)
      })
      return ok({ kind, fileNo })
    }
  )

  router.post(
    '/planning/transport-orders/:no/debriefing',
    { feature: 'DELIVERYQUALITY', action: 'execute' },
    (request) => {
      const order = db.transportOrders.findOrFail(routeParam(request, 'no'))
      if (order.closedAt) throw conflict(PLANNING_MESSAGES.closingDone)
      const trip = order.tripNo ? db.trips.find(order.tripNo) : undefined
      const departed =
        order.cancelledAt !== null ||
        order.carrierDepartedAt !== null ||
        (!!trip && ['in_progress', 'completed', 'closed'].includes(trip.status))
      if (!departed) throw conflict(PLANNING_MESSAGES.closingDebriefingEarly)
      const body = readBody(request)
      const draft = {
        voucherNo: readString(body, 'voucherNo', { required: true }),
        loadedAt: readString(body, 'loadedAt'),
        unloadedAt: readString(body, 'unloadedAt'),
        observations: readString(body, 'observations')
      }
      const means = vehicleOf(db, order)
      const issue = debriefingIssue(draft, means.vehicle)
      if (issue === 'voucher') throw unprocessable(PLANNING_MESSAGES.closingVoucher)
      if (issue === 'vehicle') throw unprocessable(PLANNING_MESSAGES.closingVehicle)
      if (issue === 'dates') throw unprocessable(PLANNING_MESSAGES.closingDates)
      // The place, the vehicle, the compartments and the gap are read, never typed (TRS05-US05).
      const debriefing: OrderDebriefing = {
        ...draft,
        voucherNo: draft.voucherNo.trim(),
        savedAt: nowIsoDateTime(),
        savedBy: sessionUser(request).code,
        place: placesOf(db, order),
        vehicle: means.vehicle,
        trailer: means.trailer,
        compartments: compartmentsOf(order, orderView(db, order.no)),
        gainLoss: gainLossText(order.lines)
      }
      db.transportOrders.update(order.no, { debriefing, ...stampModified(request) })
      return ok(debriefing)
    }
  )

  router.post(
    '/planning/transport-orders/:no/close',
    { feature: FEATURE, action: 'execute' },
    (request) => {
      const order = db.transportOrders.findOrFail(routeParam(request, 'no'))
      if (order.closedAt) throw conflict(PLANNING_MESSAGES.closingDone)
      const blocks = blocksOf(db, order)
      if (blocks.length)
        throw unprocessable(PLANNING_MESSAGES.closingBlocked, { blocks: blocks.join(', ') })
      save(
        db,
        order,
        { closedAt: nowIsoDateTime(), closedBy: sessionUser(request).code },
        request,
        order.no
      )
      return ok({ status: 'closed' })
    }
  )
}
