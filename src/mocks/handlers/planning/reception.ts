import { replanLine } from './replanning'
import {
  canHandBack,
  canReceiveReturn,
  receptionAttested,
  remainderQuantity,
  type ReceptionFacts
} from '@/modules/planning/reception/domain/reception'
import { nowIsoDateTime, todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import type {
  TransportOrderLineRow,
  TransportOrderRow
} from '../../fixtures/planning/transportOrders'
import { readBody, routeParam, stampModified } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import { invalidField, readDate, readString } from '../../http/input'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser, type MockRequest } from '../../http/types'
import { PLANNING_MESSAGES } from './messages'
import { planningSettings } from './settings'
import { readReason } from './planningReasons'
import type { TransportOrderEventKind } from '@/modules/planning/transport-orders/domain/transportOrder'

export type ReceptionState = 'awaiting' | 'contested' | 'to_rate'

export interface ReceptionLineApi {
  orderNo: string
  lineNo: number
  recipientName: string
  deliveryPointName: string
  productName: string
  unit: string
  quantity: number
  receivedQuantity: number | null
  state: ReceptionState
  attested: boolean
}

export interface ReturnLineApi {
  orderNo: string
  lineNo: number
  productNo: string
  productName: string
  unit: string
  quantity: number
  recipientName: string
  deliveryPointName: string
  handedBackAt: string | null
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

function replaceLine(
  db: MockDatabase,
  order: TransportOrderRow,
  lineNo: number,
  next: TransportOrderLineRow,
  request: MockRequest,
  kind: TransportOrderEventKind,
  detail: string
): void {
  save(
    db,
    order,
    order.lines.map((item) => (item.lineNo === lineNo ? next : item)),
    request,
    kind,
    detail
  )
}

function findLine(
  db: MockDatabase,
  request: MockRequest
): { order: TransportOrderRow; line: TransportOrderLineRow } {
  const order = db.transportOrders.findOrFail(routeParam(request, 'no'))
  const lineNo = Number(routeParam(request, 'lineNo'))
  const line = order.lines.find((item) => item.lineNo === lineNo)
  if (!line) throw unprocessable(PLANNING_MESSAGES.confirmationLineMissing)
  return { order, line }
}

function assertDeclared(line: TransportOrderLineRow): void {
  if (!line.declaredAt) throw conflict(PLANNING_MESSAGES.receptionNotDeclared)
}

function receptionState(line: TransportOrderLineRow): ReceptionState | null {
  if (!line.declaredAt) return null
  if (line.receptionContestedAt && !line.contestHandledAt) return 'contested'
  if (!line.receptionConfirmedAt && !line.receptionContestedAt) return 'awaiting'
  return null
}

export function receptionsApi(db: MockDatabase): ReceptionLineApi[] {
  const today = todayIso()
  const tacitDays = planningSettings(db).confirmation.tacitConfirmationDays
  const points = new Map(db.deliveryPoints.all().map((point) => [point.no, point]))
  const products = new Map(db.products.all().map((product) => [product.no, product]))
  const customers = new Map(db.customers.all().map((customer) => [customer.no, customer.name]))
  const rows: ReceptionLineApi[] = []
  for (const order of db.transportOrders.all()) {
    for (const line of order.lines) {
      const state = receptionState(line)
      if (!state) continue
      const point = points.get(line.deliveryPointNo)
      rows.push({
        orderNo: order.no,
        lineNo: line.lineNo,
        recipientName: customers.get(point?.customerNo ?? '') ?? '',
        deliveryPointName: point?.name ?? '',
        productName: products.get(line.productNo)?.name ?? '',
        unit: products.get(line.productNo)?.unit ?? '',
        quantity: line.quantity,
        receivedQuantity: line.receivedQuantity,
        state,
        attested: receptionAttested(line, today, tacitDays)
      })
    }
  }
  return rows
}

export function returnsApi(db: MockDatabase): ReturnLineApi[] {
  const points = new Map(db.deliveryPoints.all().map((point) => [point.no, point]))
  const products = new Map(db.products.all().map((product) => [product.no, product]))
  const customers = new Map(db.customers.all().map((customer) => [customer.no, customer.name]))
  const rows: ReturnLineApi[] = []
  for (const order of db.transportOrders.all()) {
    for (const line of order.lines) {
      if (!canReceiveReturn(line as ReceptionFacts)) continue
      const point = points.get(line.deliveryPointNo)
      const product = products.get(line.productNo)
      rows.push({
        orderNo: order.no,
        lineNo: line.lineNo,
        productNo: line.productNo,
        productName: product?.name ?? '',
        unit: product?.unit ?? '',
        quantity: line.loadedQuantity ?? line.quantity,
        recipientName: customers.get(point?.customerNo ?? '') ?? '',
        deliveryPointName: point?.name ?? '',
        handedBackAt: line.handedBackAt
      })
    }
  }
  return rows
}

export function registerReceptionHandlers(router: MockRouter, db: MockDatabase): void {
  router.get('/planning/receptions', { feature: 'CUSTOMERCONFIRMATION', action: 'read' }, () =>
    ok(receptionsApi(db))
  )
  router.get('/planning/returns', { feature: 'LOADING', action: 'read' }, () => ok(returnsApi(db)))

  router.post(
    '/planning/transport-orders/:no/lines/:lineNo/receive-confirm',
    { feature: 'CUSTOMERCONFIRMATION', action: 'execute' },
    (request) => {
      const { order, line } = findLine(db, request)
      assertDeclared(line)
      if (line.receptionConfirmedAt) throw conflict(PLANNING_MESSAGES.receptionAlreadyConfirmed)
      if (line.receptionContestedAt) throw conflict(PLANNING_MESSAGES.receptionContested)
      const signer = readString(readBody(request), 'signer', { required: true })
      replaceLine(
        db,
        order,
        line.lineNo,
        { ...line, receptionConfirmedAt: nowIsoDateTime(), receptionConfirmedBy: signer },
        request,
        'reception_confirmed',
        signer
      )
      return ok({ confirmed: true })
    }
  )

  router.post(
    '/planning/transport-orders/:no/lines/:lineNo/receive-contest',
    { feature: 'CUSTOMERCONFIRMATION', action: 'execute' },
    (request) => {
      const { order, line } = findLine(db, request)
      assertDeclared(line)
      if (line.receptionConfirmedAt) throw conflict(PLANNING_MESSAGES.receptionAlreadyConfirmed)
      if (line.receptionContestedAt) throw conflict(PLANNING_MESSAGES.receptionContested)
      const reason = readReason(db, readBody(request), 'contestation')
      replaceLine(
        db,
        order,
        line.lineNo,
        {
          ...line,
          receptionContestedAt: nowIsoDateTime(),
          contestReasonNo: reason.reasonNo,
          contestComment: reason.comment
        },
        request,
        'reception_contested',
        reason.reasonNo
      )
      return ok({ contested: true })
    }
  )

  router.post(
    '/planning/transport-orders/:no/lines/:lineNo/handle-contest',
    { feature: 'TRANSPORTORDER', action: 'update' },
    (request) => {
      const { order, line } = findLine(db, request)
      if (!line.receptionContestedAt) throw conflict(PLANNING_MESSAGES.receptionNotContested)
      if (line.contestHandledAt) throw conflict(PLANNING_MESSAGES.receptionContestHandled)
      const body = readBody(request)
      const note = readString(body, 'note', { required: true })
      const handling = body.reasonNo ? readReason(db, body, 'contestation') : null
      replaceLine(
        db,
        order,
        line.lineNo,
        {
          ...line,
          contestHandledAt: nowIsoDateTime(),
          contestHandledBy: sessionUser(request).code,
          contestNote: note,
          contestHandlingReasonNo: handling?.reasonNo ?? null
        },
        request,
        'contest_handled',
        String(line.lineNo)
      )
      return ok({ handled: true })
    }
  )

  /* The satisfaction survey is answered by the recipient himself, from his link (TRS04-US06). */

  router.post(
    '/planning/transport-orders/:no/lines/:lineNo/hand-back',
    { feature: 'TRANSPORTORDER', action: 'execute' },
    (request) => {
      const { order, line } = findLine(db, request)
      if (line.warehouseReceivedAt) throw conflict(PLANNING_MESSAGES.receptionReturnReceived)
      if (line.handedBackAt) throw conflict(PLANNING_MESSAGES.receptionAlreadyHandedBack)
      if (!canHandBack(line)) throw conflict(PLANNING_MESSAGES.receptionNothingToReturn)
      replaceLine(
        db,
        order,
        line.lineNo,
        { ...line, handedBackAt: nowIsoDateTime() },
        request,
        'handed_back',
        String(line.lineNo)
      )
      return ok({ handedBack: true })
    }
  )

  router.post(
    '/planning/transport-orders/:no/lines/:lineNo/receive-return',
    { feature: 'GOODSRETURN', action: 'execute' },
    (request) => {
      const { order, line } = findLine(db, request)
      if (!canReceiveReturn(line)) {
        throw conflict(
          line.warehouseReceivedAt
            ? PLANNING_MESSAGES.receptionReturnReceived
            : PLANNING_MESSAGES.receptionNothingToReturn
        )
      }
      const body = readBody(request)
      if (typeof body.conforming !== 'boolean') throw invalidField('conforming')
      const reason = body.conforming ? null : readReason(db, body, 'nonconformity')
      replaceLine(
        db,
        order,
        line.lineNo,
        {
          ...line,
          warehouseReceivedAt: nowIsoDateTime(),
          warehouseConforming: body.conforming,
          returnNonconformityReasonNo: reason?.reasonNo ?? null
        },
        request,
        'return_received',
        body.conforming ? 'conforming' : (reason?.reasonNo ?? '')
      )
      return ok({ received: true })
    }
  )

  router.post(
    '/planning/transport-orders/:no/lines/:lineNo/remainder',
    { feature: 'TRANSPORTORDER', action: 'update' },
    (request) => {
      const { order, line } = findLine(db, request)
      if (line.remainderAt) throw conflict(PLANNING_MESSAGES.receptionRemainderTaken)
      const left = remainderQuantity(line)
      if (left === null) throw unprocessable(PLANNING_MESSAGES.receptionNoRemainder)
      const body = readBody(request)
      const date = readDate(body, 'date', { required: true })
      if (!date) throw unprocessable(PLANNING_MESSAGES.receptionNoRemainder)
      // The remainder joins the pending order of that day, with the lines replanned to it, its
      // weight estimated at the prorata of what was not delivered (TRS01-US17).
      const pending = replanLine(db, order.no, line.lineNo, date, {
        code: sessionUser(request).code,
        request
      })
      const taken = pending.lines.find(
        (item) =>
          item.replannedFrom?.orderNo === order.no && item.replannedFrom.lineNo === line.lineNo
      )
      return ok({ requestNo: taken?.deliveryRequestNo ?? null, orderNo: pending.no })
    }
  )
}
