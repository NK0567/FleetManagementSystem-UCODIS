import { linesDelivered } from '@/modules/planning/execution/domain/execution'
import { linesConfirmed } from '@/modules/planning/customer-confirmations/domain/confirmation'
import { loadingReady } from '@/modules/planning/loading/domain/loading'
import {
  closingBlocks,
  debriefingIssue,
  gainLossText,
  requiredDocumentKinds,
  type OrderDebriefing
} from '@/modules/planning/closing/domain/closing'
import { transportOrderStatus } from '@/modules/planning/transport-orders/domain/transportOrder'
import { nowIsoDateTime, todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import type { TransportOrderRow } from '../../fixtures/planning/transportOrders'
import { readBody, routeParam, stampModified } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import { invalidField, readString } from '../../http/input'
import { requireReference } from '../../http/references'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser, type MockRequest } from '../../http/types'
import { fileMetaOf } from '../files'
import { PLANNING_MESSAGES } from './messages'
import { planningSettings } from './settings'

const FEATURE = 'TRANSPORTORDER'
const KIND = /^[a-z0-9_]{1,40}$/

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
      gainLoss: gainLossText(order.lines)
    }
  }
}

export function registerClosingHandlers(router: MockRouter, db: MockDatabase): void {
  router.get(
    '/planning/transport-orders/:no/closing',
    { feature: FEATURE, action: 'read' },
    (request) => ok(closingApi(db, db.transportOrders.findOrFail(routeParam(request, 'no'))))
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
      const issue = debriefingIssue(draft, vehicleOf(db, order).vehicle)
      if (issue === 'voucher') throw unprocessable(PLANNING_MESSAGES.closingVoucher)
      if (issue === 'vehicle') throw unprocessable(PLANNING_MESSAGES.closingVehicle)
      if (issue === 'dates') throw unprocessable(PLANNING_MESSAGES.closingDates)
      const debriefing: OrderDebriefing = {
        ...draft,
        voucherNo: draft.voucherNo.trim(),
        savedAt: nowIsoDateTime(),
        savedBy: sessionUser(request).code
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
