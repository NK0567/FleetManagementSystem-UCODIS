import {
  canCancel,
  canReject,
  deliveryRequestIssues,
  deliveryRequestStatus,
  isEditable
} from '@/modules/planning/delivery-requests/domain/deliveryRequest'
import type { DeliveryRequestApi } from '@/modules/planning/delivery-requests/types/deliveryRequest.types'
import { FREIGHT_PAYERS } from '@/modules/planning/planning-settings/domain/planningSettings'
import { nowIsoDateTime, todayIso } from '@/utils/date'
import { normalizeSearchText } from '@/utils/search'
import type { AuditFields } from '../../db/collection'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { DeliveryRequestRow } from '../../fixtures/planning/deliveryRequests'
import {
  readBody,
  registerCrudResource,
  routeParam,
  stampCreated,
  stampModified
} from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import {
  readAll,
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
import { sessionUser } from '../../http/types'
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
  | 'productNo'
  | 'quantity'
  | 'weightKg'
  | 'volumeM3'
>

export function deliveryRequestsApi(db: MockDatabase, userCode?: string): DeliveryRequestApi[] {
  const today = todayIso()
  const customers = new Map(db.customers.all().map((customer) => [customer.no, customer.name]))
  const points = new Map(db.deliveryPoints.all().map((point) => [point.no, point]))
  const products = new Map(db.products.all().map((product) => [product.no, product]))
  const reasons = new Map(db.planningReasons.all().map((reason) => [reason.no, reason.name]))
  return db.deliveryRequests
    .all()
    .filter((row) => !userCode || visibleTo(db, userCode, requestPlace(db, row.deliveryPointNo)))
    .map((row) => {
      const point = points.get(row.deliveryPointNo)
      const product = products.get(row.productNo)
      return {
        ...row,
        status: deliveryRequestStatus(row, today),
        ordererName: customers.get(row.ordererNo) ?? '',
        deliveryPointName: point?.name ?? '',
        recipientName: customers.get(point?.customerNo ?? '') ?? '',
        productName: product?.name ?? '',
        unit: product?.unit ?? '',
        rejectionReasonName: reasons.get(row.rejectionReasonNo ?? '') ?? '',
        cancellationReasonName: reasons.get(row.cancellationReasonNo ?? '') ?? ''
      }
    })
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
  if (!db.products.findOrFail(entry.productNo).active) {
    throw unprocessable(PLANNING_MESSAGES.requestProductInactive)
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
  const { freightPayer, comment, productNo, quantity, weightKg, volumeM3 } = entry
  return {
    ordererNo,
    deliveryPointNo,
    desiredDate,
    validUntil,
    externalReference,
    freightPayer,
    comment,
    productNo,
    quantity,
    weightKg,
    volumeM3
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
    productNo: (input) => requireReference(db.products, input, 'productNo'),
    quantity: (input) =>
      readNumber(input, 'quantity', { required: true, min: 0.001, max: 1000000000 }) ?? 0,
    weightKg: (input) => readNumber(input, 'weightKg', { min: 0, max: 1000000 }),
    volumeM3: (input) => readNumber(input, 'volumeM3', { min: 0, max: 10000 })
  }

  registerCrudResource(router, {
    basePath: BASE_PATH,
    feature: 'DELIVERYREQUEST',
    collection: db.deliveryRequests,
    list: (request) => deliveryRequestsApi(db, sessionUser(request).code),
    searchColumns: ['no', 'ordererName', 'deliveryPointName', 'externalReference'],
    optionFields: { freightPayer: 'freightPayer', status: 'deliveryRequestStatus' },
    create: (input, request) => {
      const entry = readAll(input, readers)
      checkDeliveryRequest(db, entry)
      // Back-office staff issue requests; the planners key them on a customer's behalf.
      const origin = sessionUser(request).profile === 'SALES' ? 'request' : 'planner'
      return newDeliveryRequest(nextDeliveryRequestNo(db), entry, origin)
    },
    // Correcting a rejected request sends it back to the planners.
    update: (existing, input) => {
      if (!isEditable(statusOf(existing))) throw conflict(PLANNING_MESSAGES.requestNotEditable)
      const patch = readPatch(input, readers)
      checkDeliveryRequest(db, { ...existing, ...patch }, existing.no)
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

  router.post(
    `${BASE_PATH}/:no/cancel`,
    { feature: 'DELIVERYREQUEST', action: 'update' },
    (request) => {
      const row = db.deliveryRequests.findOrFail(routeParam(request, 'no'))
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
        const entry = readAll(input, readers)
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
            quantity: taken,
            weightKg: share(row.weightKg, taken),
            volumeM3: share(row.volumeM3, taken)
          },
          request
        )
      )
      const rest = row.quantity - taken
      db.deliveryRequests.update(row.no, {
        quantity: rest,
        weightKg: share(row.weightKg, rest),
        volumeM3: share(row.volumeM3, rest),
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
      db.deliveryRequests.update(root.no, {
        quantity: sum((row) => row.quantity) ?? root.quantity,
        weightKg: sum((row) => row.weightKg),
        volumeM3: sum((row) => row.volumeM3),
        ...stampModified(request)
      })
      return ok(deliveryRequestsApi(db).find((item) => item.no === root.no))
    }
  )
}
