import {
  QUALITY_ACTORS,
  QUALITY_IMPACTS,
  QUALITY_ORIGINS,
  emptyQuality,
  followUpOpen,
  protestQuantityAllowed,
  protestStatus,
  qualityFacts,
  responsibilityFrozen,
  settleImpacts,
  shareIssue,
  type ProtestNote,
  type QualityActor,
  type QualityImpact,
  type QualityOrigin,
  type ResponsibilityImpact,
  type ResponsibilityShare
} from '@/modules/planning/delivery-quality/domain/quality'
import type { TransportOrderEventKind } from '@/modules/planning/transport-orders/domain/transportOrder'
import { nowIsoDateTime, todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type {
  TransportOrderLineRow,
  TransportOrderRow
} from '../../fixtures/planning/transportOrders'
import { readBody, routeParam, stampModified } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import { invalidField, readEnum, readNumber, readString } from '../../http/input'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser, type MockRequest } from '../../http/types'
import { PLANNING_MESSAGES } from './messages'
import { readReason } from './planningReasons'

const FEATURE = 'DELIVERYQUALITY'
const TRIP_FINISHED = ['completed', 'closed']

function referenceOf(line: TransportOrderLineRow): number {
  return line.loadedQuantity ?? line.quantity
}

function visited(db: MockDatabase, order: TransportOrderRow, line: TransportOrderLineRow): boolean {
  const trip = order.tripNo ? db.trips.find(order.tripNo) : undefined
  return (
    line.declaredAt !== null ||
    line.refusalAt !== null ||
    line.returnedAt !== null ||
    order.carrierArrivedAt !== null ||
    (!!trip && TRIP_FINISHED.includes(trip.status))
  )
}

function open(order: TransportOrderRow, line: TransportOrderLineRow): boolean {
  return followUpOpen(
    { cancelled: order.cancelledAt !== null, closed: order.closedAt !== null },
    line.declaredAt !== null || line.refusalAt !== null
  )
}

function save(
  db: MockDatabase,
  order: TransportOrderRow,
  lines: TransportOrderLineRow[],
  request: MockRequest,
  kind: TransportOrderEventKind,
  detail: string
): void {
  db.transportOrders.update(order.no, {
    lines,
    events: [
      ...order.events,
      { at: nowIsoDateTime(), by: sessionUser(request).code, kind, detail }
    ],
    ...stampModified(request)
  })
}

function findLine(db: MockDatabase, request: MockRequest) {
  const order = db.transportOrders.findOrFail(routeParam(request, 'no'))
  const lineNo = Number(routeParam(request, 'lineNo'))
  const line = order.lines.find((item) => item.lineNo === lineNo)
  if (!line) throw unprocessable(PLANNING_MESSAGES.confirmationLineMissing)
  return { order, line }
}

function replace(
  db: MockDatabase,
  order: TransportOrderRow,
  line: TransportOrderLineRow,
  next: TransportOrderLineRow,
  request: MockRequest,
  kind: TransportOrderEventKind,
  detail: string
): void {
  save(
    db,
    order,
    order.lines.map((item) => (item.lineNo === line.lineNo ? next : item)),
    request,
    kind,
    detail
  )
}

function assertOpen(order: TransportOrderRow, line: TransportOrderLineRow): void {
  if (!open(order, line)) throw conflict(PLANNING_MESSAGES.qualityFollowUpClosed)
}

function nextProtestNo(db: MockDatabase): string {
  const existing = db.transportOrders
    .all()
    .flatMap((order) => order.lines.flatMap((line) => line.protests.map((note) => note.no)))
  return nextNo(existing, `NP-${todayIso().slice(0, 4)}-`, 4)
}

function readShares(body: Record<string, unknown>): ResponsibilityShare[] {
  const raw = body.shares
  if (!Array.isArray(raw) || raw.length === 0) throw invalidField('shares')
  return raw.map((item) => {
    if (!item || typeof item !== 'object') throw invalidField('shares')
    const record = item as Record<string, unknown>
    const actor = readEnum(record, 'actor', QUALITY_ACTORS, { required: true })
    const percent = readNumber(record, 'percent', { required: true })
    if (!actor || percent === null) throw invalidField('shares')
    return { actor: actor as QualityActor, percent }
  })
}

function readImpacts(body: Record<string, unknown>): ResponsibilityImpact[] {
  const raw = body.impacts
  if (!Array.isArray(raw)) throw invalidField('impacts')
  return raw.map((item) => {
    if (!item || typeof item !== 'object') throw invalidField('impacts')
    const record = item as Record<string, unknown>
    const type = readEnum(record, 'type', QUALITY_IMPACTS, { required: true })
    const amount = readNumber(record, 'amount', { required: true })
    if (!type || amount === null) throw invalidField('impacts')
    return { type: type as QualityImpact, amount }
  })
}

const SHARE_MESSAGES = {
  duplicate: PLANNING_MESSAGES.qualityShareDuplicate,
  externalMeans: PLANNING_MESSAGES.qualityExternalMeans,
  internalMeans: PLANNING_MESSAGES.qualityInternalMeans,
  percent: PLANNING_MESSAGES.qualitySharePercent,
  total: PLANNING_MESSAGES.qualityShareTotal
} as const

export function deliveryQualityApi(db: MockDatabase) {
  const points = new Map(db.deliveryPoints.all().map((point) => [point.no, point]))
  const products = new Map(db.products.all().map((product) => [product.no, product]))
  const customers = new Map(db.customers.all().map((customer) => [customer.no, customer.name]))
  const rows = []
  for (const order of db.transportOrders.all()) {
    for (const line of order.lines) {
      const facts = qualityFacts(line)
      if (!visited(db, order, line) && facts.length === 0 && !line.responsibility) continue
      const point = points.get(line.deliveryPointNo)
      rows.push({
        orderNo: order.no,
        lineNo: line.lineNo,
        recipientName: customers.get(point?.customerNo ?? '') ?? '',
        deliveryPointName: point?.name ?? '',
        productName: products.get(line.productNo)?.name ?? '',
        unit: products.get(line.productNo)?.unit ?? '',
        quantity: referenceOf(line),
        means: order.means,
        facts,
        protests: line.protests.map((note) => ({ ...note, status: protestStatus(note) })),
        responsibility: line.responsibility,
        creditReference: line.creditReference,
        creditIssuedAt: line.creditIssuedAt
      })
    }
  }
  return rows
}

export function registerDeliveryQualityHandlers(router: MockRouter, db: MockDatabase): void {
  router.get('/planning/delivery-quality', { feature: FEATURE, action: 'read' }, () =>
    ok(deliveryQualityApi(db))
  )

  router.post(
    '/planning/transport-orders/:no/lines/:lineNo/protests',
    { feature: FEATURE, action: 'execute' },
    (request) => {
      const { order, line } = findLine(db, request)
      assertOpen(order, line)
      if (!visited(db, order, line)) throw conflict(PLANNING_MESSAGES.qualityNotVisited)
      const body = readBody(request)
      const reason = readReason(db, body, 'protest')
      const quantity = readNumber(body, 'quantity', { required: true, min: 0 }) ?? 0
      if (!protestQuantityAllowed(quantity, referenceOf(line))) {
        throw unprocessable(PLANNING_MESSAGES.qualityQuantity)
      }
      const note: ProtestNote = {
        no: nextProtestNo(db),
        reasonNo: reason.reasonNo,
        comment: reason.comment,
        quantity,
        preparedAt: nowIsoDateTime(),
        preparedBy: sessionUser(request).code,
        issuedAt: null,
        closedAt: null,
        outcome: ''
      }
      replace(
        db,
        order,
        line,
        { ...line, protests: [...line.protests, note] },
        request,
        'protest_prepared',
        note.no
      )
      return ok({ no: note.no })
    }
  )

  router.patch(
    '/planning/transport-orders/:no/lines/:lineNo/protests/:protestNo',
    { feature: FEATURE, action: 'execute' },
    (request) => {
      const { order, line } = findLine(db, request)
      assertOpen(order, line)
      const protestNo = routeParam(request, 'protestNo')
      const note = line.protests.find((item) => item.no === protestNo)
      if (!note) throw unprocessable(PLANNING_MESSAGES.confirmationLineMissing)
      if (protestStatus(note) !== 'preparing')
        throw conflict(PLANNING_MESSAGES.qualityProtestIssued)
      const body = readBody(request)
      const reason = readReason(db, body, 'protest')
      const quantity = readNumber(body, 'quantity', { required: true, min: 0 }) ?? 0
      if (!protestQuantityAllowed(quantity, referenceOf(line)))
        throw unprocessable(PLANNING_MESSAGES.qualityQuantity)
      const next = { ...note, reasonNo: reason.reasonNo, comment: reason.comment, quantity }
      replace(
        db,
        order,
        line,
        { ...line, protests: line.protests.map((item) => (item.no === protestNo ? next : item)) },
        request,
        'protest_prepared',
        protestNo
      )
      return ok({ no: protestNo })
    }
  )

  router.post(
    '/planning/transport-orders/:no/lines/:lineNo/protests/:protestNo/issue',
    { feature: FEATURE, action: 'execute' },
    (request) => {
      const { order, line } = findLine(db, request)
      assertOpen(order, line)
      const protestNo = routeParam(request, 'protestNo')
      const note = line.protests.find((item) => item.no === protestNo)
      if (!note) throw unprocessable(PLANNING_MESSAGES.confirmationLineMissing)
      if (protestStatus(note) !== 'preparing')
        throw conflict(PLANNING_MESSAGES.qualityProtestIssued)
      const next = { ...note, issuedAt: nowIsoDateTime() }
      replace(
        db,
        order,
        line,
        { ...line, protests: line.protests.map((item) => (item.no === protestNo ? next : item)) },
        request,
        'protest_issued',
        protestNo
      )
      return ok({ status: 'issued' })
    }
  )

  router.post(
    '/planning/transport-orders/:no/lines/:lineNo/protests/:protestNo/close',
    { feature: FEATURE, action: 'execute' },
    (request) => {
      const { order, line } = findLine(db, request)
      const protestNo = routeParam(request, 'protestNo')
      const note = line.protests.find((item) => item.no === protestNo)
      if (!note) throw unprocessable(PLANNING_MESSAGES.confirmationLineMissing)
      if (protestStatus(note) !== 'issued')
        throw conflict(PLANNING_MESSAGES.qualityProtestNotIssued)
      const outcome = readString(readBody(request), 'outcome', { required: true })
      const next = { ...note, closedAt: nowIsoDateTime(), outcome }
      replace(
        db,
        order,
        line,
        { ...line, protests: line.protests.map((item) => (item.no === protestNo ? next : item)) },
        request,
        'protest_closed',
        protestNo
      )
      return ok({ status: 'closed' })
    }
  )

  router.post(
    '/planning/transport-orders/:no/lines/:lineNo/responsibility',
    { feature: FEATURE, action: 'execute' },
    (request) => {
      const { order, line } = findLine(db, request)
      assertOpen(order, line)
      if (responsibilityFrozen(line)) throw conflict(PLANNING_MESSAGES.qualityFrozen)
      if (qualityFacts(line).length === 0) throw unprocessable(PLANNING_MESSAGES.qualityNoFact)
      const body = readBody(request)
      const origin = readEnum(body, 'origin', QUALITY_ORIGINS, { required: true }) as QualityOrigin
      const shares = readShares(body)
      const issue = shareIssue(shares, order.means)
      if (issue) throw unprocessable(SHARE_MESSAGES[issue])
      const comment = readString(body, 'comment', { required: true })
      const external = shares.find((share) => share.actor === 'external_carrier')?.percent ?? 0
      const settled = settleImpacts(readImpacts(body), external)
      if (settled === 'duplicate') throw unprocessable(PLANNING_MESSAGES.qualityImpactDuplicate)
      if (settled === 'amount') throw unprocessable(PLANNING_MESSAGES.qualityImpactAmount)
      if (settled === 'withholding') throw unprocessable(PLANNING_MESSAGES.qualityWithholding)
      const credit = settled.find((impact) => impact.type === 'customer_credit')?.amount ?? 0
      const previous =
        line.responsibility?.impacts.find((impact) => impact.type === 'customer_credit')?.amount ??
        0
      if (line.creditIssuedAt && credit !== previous)
        throw conflict(PLANNING_MESSAGES.qualityCreditIssued)
      replace(
        db,
        order,
        line,
        {
          ...line,
          responsibility: {
            origin,
            shares,
            comment,
            impacts: settled,
            establishedAt: nowIsoDateTime(),
            establishedBy: sessionUser(request).code
          }
        },
        request,
        'responsibility_set',
        String(line.lineNo)
      )
      return ok({ impacts: settled })
    }
  )

  router.post(
    '/planning/transport-orders/:no/lines/:lineNo/issue-credit',
    { feature: FEATURE, action: 'execute' },
    (request) => {
      const { order, line } = findLine(db, request)
      const credit = line.responsibility?.impacts.find(
        (impact) => impact.type === 'customer_credit'
      )
      if (!credit) throw conflict(PLANNING_MESSAGES.qualityCreditMissing)
      if (line.creditIssuedAt) throw conflict(PLANNING_MESSAGES.qualityCreditIssued)
      const reference = readString(readBody(request), 'reference', { required: true })
      const key = reference.toLowerCase()
      const taken = db.transportOrders
        .all()
        .some((item) =>
          item.lines.some(
            (other) =>
              (other.creditReference && other.creditReference.toLowerCase() === key) ||
              (other.invoiceReference && other.invoiceReference.toLowerCase() === key)
          )
        )
      if (taken) throw conflict(PLANNING_MESSAGES.qualityCreditReference)
      replace(
        db,
        order,
        line,
        {
          ...line,
          creditReference: reference,
          creditIssuedAt: nowIsoDateTime(),
          creditIssuedBy: sessionUser(request).code
        },
        request,
        'credit_issued',
        reference
      )
      return ok({ reference })
    }
  )
}
