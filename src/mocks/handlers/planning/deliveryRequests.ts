import {
  canCancel,
  canReject,
  deliveryRequestIssues,
  deliveryRequestStatus,
  isEditable,
  linesSummary,
  requestLines
} from '@/modules/planning/delivery-requests/domain/deliveryRequest'
import {
  DELIVERY_SLOTS,
  NOTIFICATION_CHANNELS
} from '@/modules/planning/customers/types/customer.types'
import type {
  DeliveryFollowUp,
  DeliveryRequestApi,
  DeliveryRequestLine
} from '@/modules/planning/delivery-requests/types/deliveryRequest.types'
import { FREIGHT_PAYERS } from '@/modules/planning/planning-settings/domain/planningSettings'
import { nowIsoDateTime, todayIso } from '@/utils/date'
import { normalizeSearchText } from '@/utils/search'
import type { AuditFields } from '../../db/collection'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { DeliveryRequestRow } from '../../fixtures/planning/deliveryRequests'
import type { TransportOrderLineRow } from '../../fixtures/planning/transportOrders'
import {
  readBody,
  registerCrudResource,
  routeParam,
  stampCreated,
  stampModified
} from '../../http/crudResource'
import { conflict, forbidden, notFound, unprocessable } from '../../http/errors'
import {
  invalidField,
  readAll,
  readBoolean,
  readDate,
  readEnum,
  readNumber,
  readPatch,
  readString,
  type FieldReaders
} from '../../http/input'
import { importRows } from '../../http/importRows'
import { requireReference } from '../../http/references'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser, type MockRequest } from '../../http/types'
import { requestPlace, visibleTo } from './perimeter'
import { PLANNING_MESSAGES } from './messages'
import { readReason } from './planningReasons'
import { planningSettings } from './settings'

const BASE_PATH = '/planning/delivery-requests'

type Entry = Pick<
  DeliveryRequestRow,
  | 'ordererNo'
  | 'deliveryPointNo'
  | 'desiredDate'
  | 'validUntil'
  | 'externalReference'
  | 'freightPayer'
  | 'comment'
  | 'lines'
  | 'productNo'
  | 'quantity'
  | 'weightKg'
  | 'volumeM3'
  | 'notificationChannel'
  | 'confirmationRequired'
  | 'preferredSlot'
  | 'fullDeliveryRequired'
>

export function deliveryRequestsApi(
  db: MockDatabase,
  userCode?: string,
  ordererNo?: string
): DeliveryRequestApi[] {
  const today = todayIso()
  const customers = new Map(db.customers.all().map((customer) => [customer.no, customer.name]))
  const points = new Map(db.deliveryPoints.all().map((point) => [point.no, point]))
  const products = new Map(db.products.all().map((product) => [product.no, product]))
  const reasons = new Map(db.planningReasons.all().map((reason) => [reason.no, reason.name]))
  const orders = db.transportOrders.all()
  const vehicles = new Map(db.vehicles.all().map((vehicle) => [vehicle.no, vehicle.plate]))
  return db.deliveryRequests
    .all()
    .filter((row) => !userCode || visibleTo(db, userCode, requestPlace(db, row.deliveryPointNo)))
    .filter((row) => !ordererNo || row.ordererNo === ordererNo)
    .map((row) => {
      const point = points.get(row.deliveryPointNo)
      const product = products.get(row.productNo)
      const lines = requestLines(row).map((line) => ({
        ...line,
        productName: products.get(line.productNo)?.name ?? '',
        productFamily: products.get(line.productNo)?.family ?? '',
        unit: products.get(line.productNo)?.unit ?? ''
      }))
      return {
        ...row,
        lines,
        lineCount: lines.length,
        status: deliveryRequestStatus(row, today),
        ordererName: customers.get(row.ordererNo) ?? '',
        deliveryPointName: point?.name ?? '',
        recipientName: customers.get(point?.customerNo ?? '') ?? '',
        /* Every product of the order, so that a list shows what it carries without opening it. */
        productName:
          lines.length > 1
            ? [...new Set(lines.map((line) => line.productName))].join(', ')
            : (product?.name ?? ''),
        unit: new Set(lines.map((line) => line.unit)).size > 1 ? '' : (product?.unit ?? ''),
        ...followUpOf(row.no, orders, (no) => {
          const trip = no ? db.trips.find(no) : undefined
          return trip ? (vehicles.get(trip.vehicleNo) ?? '') : ''
        }),
        rejectionReasonName: reasons.get(row.rejectionReasonNo ?? '') ?? '',
        cancellationReasonName: reasons.get(row.cancellationReasonNo ?? '') ?? '',
        ordererSurvey: row.ordererSurvey ?? null
      }
    })
}

/**
 * Where the order stands once in a transport order (TRS01-US03): read from the line that carries
 * it, so that the orderer follows it to the delivery without asking the planner.
 */
function followUpOf(
  no: string,
  orders: readonly {
    no: string
    cancelledAt: string | null
    tripNo: string | null
    carrierVehiclePlate: string
    plannedDeparture: string | null
    lines: readonly TransportOrderLineRow[]
    closedAt?: string | null
  }[],
  plateOf: (tripNo: string | null) => string
) {
  const order = orders.find(
    (item) => !item.cancelledAt && item.lines.some((line) => line.deliveryRequestNo === no)
  )
  const line = order?.lines.find((item) => item.deliveryRequestNo === no)
  if (!order || !line) {
    return {
      followUp: null as DeliveryFollowUp | null,
      plannedOn: null as string | null,
      vehiclePlate: '',
      orderCompleted: false
    }
  }
  const followUp: DeliveryFollowUp = line.replannedAt
    ? 'to_replan'
    : line.receptionContestedAt
      ? 'contested'
      : line.receptionConfirmedAt
        ? 'confirmed'
        : line.refusalAt
          ? 'refused'
          : line.declaredAt
            ? 'delivered'
            : line.postponedAt
              ? 'postponed'
              : 'planned'
  return {
    followUp,
    plannedOn: order.plannedDeparture,
    vehiclePlate: plateOf(order.tripNo) || order.carrierVehiclePlate,
    // The orderer's survey opens once the transport order is completed (TRS04-US07).
    orderCompleted: !!order.closedAt
  }
}

/** An orderer account orders for its own orderer only; the others order for anyone. */
function ownEntry<T extends Pick<Entry, 'ordererNo'>>(entry: T, request: MockRequest): T {
  const mine = sessionUser(request).ordererNo
  if (mine && entry.ordererNo !== mine) throw forbidden(PLANNING_MESSAGES.requestNotYours)
  return entry
}

function assertOwn(row: DeliveryRequestRow, request: MockRequest): void {
  const mine = sessionUser(request).ordererNo
  if (mine && row.ordererNo !== mine) throw notFound()
}

const statusOf = (row: DeliveryRequestRow) => deliveryRequestStatus(row, todayIso())

/** Checks a request as it will be stored, whoever sent it and however it came in. */
export function checkDeliveryRequest(db: MockDatabase, entry: Entry, no?: string): void {
  const orderer = db.customers.findOrFail(entry.ordererNo)
  if (!orderer.isOrderer || !orderer.active) {
    throw unprocessable(PLANNING_MESSAGES.requestOrdererInvalid)
  }
  if (!db.deliveryPoints.findOrFail(entry.deliveryPointNo).active) {
    throw unprocessable(PLANNING_MESSAGES.requestPointInactive)
  }
  if (!entry.lines.length) throw unprocessable(PLANNING_MESSAGES.requestNeedsLines)
  for (const line of entry.lines) {
    if (!db.products.findOrFail(line.productNo).active) {
      throw unprocessable(PLANNING_MESSAGES.requestProductInactive)
    }
  }
  const [issue] = deliveryRequestIssues(entry, todayIso())
  if (issue) throw unprocessable(PLANNING_MESSAGES[`request_${issue}`])
  const settings = planningSettings(db).requests
  const reference = normalizeSearchText(entry.externalReference)
  if (!reference) {
    if (settings.externalReferenceRequired) {
      throw unprocessable(PLANNING_MESSAGES.requestReferenceRequired, {
        label: settings.externalReferenceLabel
      })
    }
    return
  }
  // A customer's reference names one request: a second one is a duplicate.
  const twin = db.deliveryRequests
    .all()
    .find(
      (other) =>
        other.no !== no &&
        other.ordererNo === entry.ordererNo &&
        !other.cancelledAt &&
        normalizeSearchText(other.externalReference) === reference
    )
  if (twin) throw conflict(PLANNING_MESSAGES.requestReferenceTaken, { no: twin.no })
}

// Only the entered fields: a part copied from a request must not carry its number or its history.
function pickEntry(entry: Entry): Entry {
  const { ordererNo, deliveryPointNo, desiredDate, validUntil, externalReference } = entry
  const { freightPayer, comment, notificationChannel, confirmationRequired } = entry
  const { preferredSlot, fullDeliveryRequired } = entry
  const lines = requestLines(entry)
  return {
    ordererNo,
    deliveryPointNo,
    desiredDate,
    validUntil,
    externalReference,
    freightPayer,
    comment,
    lines,
    ...linesSummary(lines),
    notificationChannel,
    confirmationRequired,
    preferredSlot,
    fullDeliveryRequired
  }
}

export function nextDeliveryRequestNo(db: MockDatabase): string {
  return nextNo(
    db.deliveryRequests.all().map((row) => row.no),
    `DL-${todayIso().slice(0, 4)}-`,
    4
  )
}

/** A new request as the server stores it, from fields already checked. */
export function newDeliveryRequest(
  no: string,
  entry: Entry,
  origin: DeliveryRequestRow['origin']
): Omit<DeliveryRequestRow, keyof AuditFields> {
  return {
    ...pickEntry(entry),
    no,
    origin,
    parentNo: null,
    rejectionReasonNo: null,
    rejectionComment: '',
    rejectedAt: null,
    rejectedBy: null,
    cancellationReasonNo: null,
    cancellationComment: '',
    cancelledAt: null,
    cancelledBy: null,
    transportOrderNo: null
  }
}

/** The recipient's preferences as kept on its record: copied on a new order. */
export function recipientPreferences(db: MockDatabase, deliveryPointNo: string) {
  const point = db.deliveryPoints.find(deliveryPointNo)
  const customer = point ? db.customers.find(point.customerNo) : undefined
  return {
    notificationChannel: customer?.notificationChannel ?? 'sms',
    confirmationRequired: customer?.confirmationRequired ?? true,
    preferredSlot: customer?.preferredSlot ?? 'any'
  }
}

/** The product lines sent, or a single line from the flat fields of a file row. */
function readRequestLines(db: MockDatabase, input: Record<string, unknown>): DeliveryRequestLine[] {
  const raw = input.lines
  const rows: Record<string, unknown>[] = Array.isArray(raw)
    ? raw.map((item) => {
        if (!item || typeof item !== 'object') throw invalidField('lines')
        return item as Record<string, unknown>
      })
    : [input]
  return rows.map((row, index) => ({
    lineNo: index + 1,
    productNo: requireReference(db.products, row, 'productNo'),
    quantity: readNumber(row, 'quantity', { required: true, min: 0.001, max: 1000000000 }) ?? 0,
    weightKg: readNumber(row, 'weightKg', { min: 0, max: 1000000 }),
    volumeM3: readNumber(row, 'volumeM3', { min: 0, max: 10000 })
  }))
}

/**
 * An order rebuilt from one line (a new date, a remainder): one product line, and the preferences
 * of the order it comes from, else those of the recipient.
 */
export function entryFromLine(
  db: MockDatabase,
  fields: Omit<
    Entry,
    'lines' | keyof ReturnType<typeof recipientPreferences> | 'fullDeliveryRequired'
  >,
  source?: DeliveryRequestRow
): Entry {
  const { productNo, quantity, weightKg, volumeM3 } = fields
  return {
    ...fields,
    lines: [{ lineNo: 1, productNo, quantity, weightKg, volumeM3 }],
    ...(source
      ? {
          notificationChannel: source.notificationChannel,
          confirmationRequired: source.confirmationRequired,
          preferredSlot: source.preferredSlot
        }
      : recipientPreferences(db, fields.deliveryPointNo)),
    fullDeliveryRequired: source?.fullDeliveryRequired ?? false
  }
}

/** On creation, a preference left out is taken from the recipient's record. */
function withPreferences(db: MockDatabase, input: Record<string, unknown>, entry: Entry): Entry {
  const kept = recipientPreferences(db, entry.deliveryPointNo)
  return {
    ...entry,
    notificationChannel:
      'notificationChannel' in input ? entry.notificationChannel : kept.notificationChannel,
    confirmationRequired:
      'confirmationRequired' in input ? entry.confirmationRequired : kept.confirmationRequired,
    preferredSlot: 'preferredSlot' in input ? entry.preferredSlot : kept.preferredSlot
  }
}

/** A one-line order shared by quantity: the line and the flat fields stay in step. */
function splitLine(
  row: DeliveryRequestRow,
  quantity: number,
  share: (value: number | null, part: number) => number | null
): Pick<DeliveryRequestRow, 'quantity' | 'weightKg' | 'volumeM3' | 'lines'> {
  const weightKg = share(row.weightKg, quantity)
  const volumeM3 = share(row.volumeM3, quantity)
  return {
    quantity,
    weightKg,
    volumeM3,
    lines: [{ lineNo: 1, productNo: row.productNo, quantity, weightKg, volumeM3 }]
  }
}

export function registerDeliveryRequestsHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<Entry> = {
    ordererNo: (input) => requireReference(db.customers, input, 'ordererNo'),
    deliveryPointNo: (input) => requireReference(db.deliveryPoints, input, 'deliveryPointNo'),
    desiredDate: (input) => readDate(input, 'desiredDate', { required: true }) ?? '',
    validUntil: (input) => readDate(input, 'validUntil'),
    externalReference: (input) => readString(input, 'externalReference'),
    freightPayer: (input) =>
      readEnum(input, 'freightPayer', FREIGHT_PAYERS) ??
      planningSettings(db).billing.defaultFreightPayer,
    comment: (input) => readString(input, 'comment'),
    lines: (input) => readRequestLines(db, input),
    // The flat fields follow the lines; they are recomputed whenever the lines change.
    productNo: () => '',
    quantity: () => 0,
    weightKg: () => null,
    volumeM3: () => null,
    notificationChannel: (input) =>
      readEnum(input, 'notificationChannel', NOTIFICATION_CHANNELS) ?? 'sms',
    confirmationRequired: (input) => readBoolean(input, 'confirmationRequired', true),
    preferredSlot: (input) => readEnum(input, 'preferredSlot', DELIVERY_SLOTS) ?? 'any',
    fullDeliveryRequired: (input) => readBoolean(input, 'fullDeliveryRequired', false)
  }
  // The flat fields follow the lines: a change only ever goes through the lines.
  const patchReaders: Partial<FieldReaders<Entry>> = { ...readers }
  for (const field of ['productNo', 'quantity', 'weightKg', 'volumeM3'] as const) {
    delete patchReaders[field]
  }
  const readEntry = (input: Record<string, unknown>): Entry => {
    const entry = readAll(input, readers)
    return { ...withPreferences(db, input, entry), ...linesSummary(entry.lines) }
  }

  registerCrudResource(router, {
    basePath: BASE_PATH,
    feature: 'DELIVERYREQUEST',
    collection: db.deliveryRequests,
    list: (request) =>
      deliveryRequestsApi(db, sessionUser(request).code, sessionUser(request).ordererNo),
    searchColumns: ['no', 'ordererName', 'deliveryPointName', 'externalReference'],
    optionFields: { freightPayer: 'freightPayer', status: 'deliveryRequestStatus' },
    create: (input, request) => {
      const entry = ownEntry(readEntry(input), request)
      checkDeliveryRequest(db, entry)
      // Back-office staff issue requests; the planners key them on a customer's behalf.
      const origin = sessionUser(request).profile === 'SALES' ? 'request' : 'planner'
      return newDeliveryRequest(nextDeliveryRequestNo(db), entry, origin)
    },
    // Correcting a rejected request sends it back to the planners.
    update: (existing, input, request) => {
      assertOwn(existing, request)
      if ('ordererNo' in input) ownEntry({ ordererNo: String(input.ordererNo) } as Entry, request)
      if (!isEditable(statusOf(existing))) throw conflict(PLANNING_MESSAGES.requestNotEditable)
      const patch: Partial<Entry> = readPatch(input, patchReaders as FieldReaders<Entry>)
      if (patch.lines) Object.assign(patch, linesSummary(patch.lines))
      checkDeliveryRequest(
        db,
        { ...existing, lines: requestLines(existing), ...patch },
        existing.no
      )
      return {
        ...patch,
        rejectionReasonNo: null,
        rejectionComment: '',
        rejectedAt: null,
        rejectedBy: null
      }
    }
  })

  router.post(
    `${BASE_PATH}/:no/reject`,
    { feature: 'DELIVERYREQUEST', action: 'execute' },
    (request) => {
      const row = db.deliveryRequests.findOrFail(routeParam(request, 'no'))
      if (!canReject(statusOf(row))) throw conflict(PLANNING_MESSAGES.requestNotRejectable)
      const reason = readReason(db, readBody(request), 'request_rejection')
      const updated = db.deliveryRequests.update(row.no, {
        rejectionReasonNo: reason.reasonNo,
        rejectionComment: reason.comment,
        rejectedAt: nowIsoDateTime(),
        rejectedBy: sessionUser(request).code,
        ...stampModified(request)
      })
      return ok(deliveryRequestsApi(db).find((item) => item.no === updated.no))
    }
  )

  /* The orderer answers a survey on the execution of his order once its transport order is
   * completed: order, delays and quality, from 1 to 5, and a comment (TRS04-US07). */
  router.post(
    `${BASE_PATH}/:no/satisfaction`,
    { feature: 'DELIVERYREQUEST', action: 'update' },
    (request) => {
      const row = db.deliveryRequests.findOrFail(routeParam(request, 'no'))
      assertOwn(row, request)
      const item = deliveryRequestsApi(db).find((entry) => entry.no === row.no)
      if (!item?.orderCompleted || row.ordererSurvey) {
        throw conflict(PLANNING_MESSAGES.receptionSatisfactionClosed)
      }
      const body = readBody(request)
      const score = (field: string) => {
        const value = readNumber(body, field, { required: true, min: 1, max: 5 })!
        if (!Number.isInteger(value)) throw invalidField(field)
        return value
      }
      db.deliveryRequests.update(row.no, {
        ordererSurvey: {
          orderScore: score('orderScore'),
          delayScore: score('delayScore'),
          qualityScore: score('qualityScore'),
          comment: readString(body, 'comment'),
          at: nowIsoDateTime(),
          by: sessionUser(request).code
        },
        ...stampModified(request)
      })
      return ok(deliveryRequestsApi(db).find((entry) => entry.no === row.no))
    }
  )

  router.post(
    `${BASE_PATH}/:no/cancel`,
    { feature: 'DELIVERYREQUEST', action: 'update' },
    (request) => {
      const row = db.deliveryRequests.findOrFail(routeParam(request, 'no'))
      assertOwn(row, request)
      if (!canCancel(statusOf(row))) throw conflict(PLANNING_MESSAGES.requestNotCancellable)
      const reason = readReason(db, readBody(request), 'cancellation')
      const updated = db.deliveryRequests.update(row.no, {
        cancellationReasonNo: reason.reasonNo,
        cancellationComment: reason.comment,
        cancelledAt: nowIsoDateTime(),
        cancelledBy: sessionUser(request).code,
        ...stampModified(request)
      })
      return ok(deliveryRequestsApi(db).find((item) => item.no === updated.no))
    }
  )

  // A request comes into the system the same way whether it is typed or read from a file.
  router.post(`${BASE_PATH}/import`, { feature: 'DELIVERYREQUEST', action: 'insert' }, (request) =>
    ok(
      importRows(readBody(request).rows, request, (input) => {
        const entry = ownEntry(readEntry(input), request)
        checkDeliveryRequest(db, entry)
        const no = nextDeliveryRequestNo(db)
        db.deliveryRequests.insert(stampCreated(newDeliveryRequest(no, entry, 'import'), request))
        return no
      })
    )
  )

  router.post(
    `${BASE_PATH}/:no/split`,
    { feature: 'DELIVERYREQUEST', action: 'execute' },
    (request) => {
      const row = db.deliveryRequests.findOrFail(routeParam(request, 'no'))
      if (statusOf(row) !== 'pending') throw conflict(PLANNING_MESSAGES.requestNotSplittable)
      if (requestLines(row).length > 1) throw conflict(PLANNING_MESSAGES.requestSplitMultiLine)
      const taken = readNumber(readBody(request), 'quantity', { required: true, min: 0.001 }) ?? 0
      if (taken >= row.quantity) throw unprocessable(PLANNING_MESSAGES.requestSplitTooLarge)
      const share = (value: number | null, part: number) =>
        value == null ? null : Math.round(value * (part / row.quantity) * 10) / 10
      const no = nextDeliveryRequestNo(db)
      // The part keeps the customer's reference on the root only, so the reference stays unique.
      db.deliveryRequests.insert(
        stampCreated(
          {
            ...newDeliveryRequest(no, { ...row, externalReference: '' }, row.origin),
            parentNo: row.parentNo ?? row.no,
            ...splitLine(row, taken, share)
          },
          request
        )
      )
      const rest = row.quantity - taken
      db.deliveryRequests.update(row.no, {
        ...splitLine(row, rest, share),
        ...stampModified(request)
      })
      return ok(deliveryRequestsApi(db).find((item) => item.no === no))
    }
  )

  router.post(
    `${BASE_PATH}/:no/merge`,
    { feature: 'DELIVERYREQUEST', action: 'execute' },
    (request) => {
      const root = db.deliveryRequests.findOrFail(routeParam(request, 'no'))
      if (root.parentNo || statusOf(root) !== 'pending') {
        throw conflict(PLANNING_MESSAGES.requestNotMergeable)
      }
      const parts = db.deliveryRequests
        .all()
        .filter((row) => row.parentNo === root.no && statusOf(row) === 'pending')
      if (!parts.length) throw conflict(PLANNING_MESSAGES.requestNoPartToMerge)
      const sum = (pick: (row: DeliveryRequestRow) => number | null) => {
        const values = [root, ...parts].map(pick)
        return values.some((value) => value == null)
          ? null
          : values.reduce<number>((total, value) => total + (value ?? 0), 0)
      }
      // A part still waiting was never planned: nothing points to it, so it goes back into the root.
      for (const part of parts) db.deliveryRequests.remove(part.no)
      const quantity = sum((row) => row.quantity) ?? root.quantity
      const weightKg = sum((row) => row.weightKg)
      const volumeM3 = sum((row) => row.volumeM3)
      db.deliveryRequests.update(root.no, {
        quantity,
        weightKg,
        volumeM3,
        lines: [{ lineNo: 1, productNo: root.productNo, quantity, weightKg, volumeM3 }],
        ...stampModified(request)
      })
      return ok(deliveryRequestsApi(db).find((item) => item.no === root.no))
    }
  )
}
