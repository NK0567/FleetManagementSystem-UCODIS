import { stillToLoad, loadingReady } from '@/modules/planning/loading/domain/loading'
import {
  firstArrivalMarked,
  linesConfirmed
} from '@/modules/planning/customer-confirmations/domain/confirmation'
import { transportOrderStatus } from '@/modules/planning/transport-orders/domain/transportOrder'
import { nowIsoDateTime } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import type { TransportOrderRow } from '../../fixtures/planning/transportOrders'
import { readBody, routeParam, stampModified } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import { invalidField, readNumber } from '../../http/input'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import type { MockRequest } from '../../http/types'
import { driverOrder } from './execution'
import { PLANNING_MESSAGES } from './messages'
import { readReason } from './planningReasons'
import { assertLoadable } from './orderPlan'

function statusOf(db: MockDatabase, order: TransportOrderRow) {
  const trip = order.tripNo ? db.trips.find(order.tripNo) : undefined
  return transportOrderStatus({
    cancelledAt: order.cancelledAt,
    means: order.means,
    tripStatus: trip?.status ?? null,
    linesConfirmed: linesConfirmed(order.lines),
    firstArrival: firstArrivalMarked(order.lines),
    loadingReady: loadingReady(order.lines)
  })
}

export function registerLoadingHandlers(router: MockRouter, db: MockDatabase): void {
  router.get('/planning/loading', { feature: 'LOADING', action: 'read' }, () => {
    const points = new Map(db.deliveryPoints.all().map((point) => [point.no, point]))
    const products = new Map(db.products.all().map((product) => [product.no, product]))
    const customers = new Map(db.customers.all().map((customer) => [customer.no, customer.name]))
    const rows = []
    for (const order of db.transportOrders.all()) {
      if (statusOf(db, order) !== 'confirmed') continue
      for (const line of order.lines.filter(stillToLoad)) {
        const point = points.get(line.deliveryPointNo)
        const product = products.get(line.productNo)
        rows.push({
          orderNo: order.no,
          /* A fleet driver checks his own load; the check is done here for a carrier's order. */
          checkedByDriver: order.means === 'fleet',
          lineNo: line.lineNo,
          productNo: line.productNo,
          productName: product?.name ?? '',
          unit: product?.unit ?? '',
          deliveryPointName: point?.name ?? '',
          recipientName: customers.get(point?.customerNo ?? '') ?? '',
          quantity: line.quantity,
          loadedQuantity: line.loadedQuantity,
          conformingAt: line.conformingAt
        })
      }
    }
    return ok(rows)
  })

  router.put(
    '/planning/transport-orders/:no/loading',
    { feature: 'LOADING', action: 'update' },
    (request) => {
      const order = db.transportOrders.findOrFail(routeParam(request, 'no'))
      if (statusOf(db, order) !== 'confirmed') throw conflict(PLANNING_MESSAGES.loadingClosed)
      // Past its date, an order is loaded only once rescheduled, when the company blocks it (TRS07-US07).
      assertLoadable(db, order)
      const raw = readBody(request).lines
      if (!Array.isArray(raw)) throw invalidField('lines')
      const quantities = new Map<number, number>()
      for (const item of raw) {
        if (!item || typeof item !== 'object') throw invalidField('lines')
        const row = item as Record<string, unknown>
        const lineNo = readNumber(row, 'lineNo', { required: true, min: 1 }) ?? 0
        const loadedQuantity = readNumber(row, 'loadedQuantity', { required: true, min: 0 }) ?? 0
        quantities.set(lineNo, loadedQuantity)
      }
      const staying = order.lines.filter(stillToLoad)
      if (staying.some((line) => !quantities.has(line.lineNo))) {
        throw unprocessable(PLANNING_MESSAGES.loadingQuantityMissing)
      }
      const lines = order.lines.map((line) =>
        quantities.has(line.lineNo)
          ? { ...line, loadedQuantity: quantities.get(line.lineNo) ?? null }
          : line
      )
      db.transportOrders.update(order.no, { lines, ...stampModified(request) })
      return ok(lines)
    }
  )

  const check = (
    name: string,
    apply: (
      line: TransportOrderRow['lines'][number],
      request: MockRequest
    ) => TransportOrderRow['lines'][number]
  ) =>
    router.post(
      `/planning/transport-orders/:no/lines/:lineNo/${name}`,
      { feature: 'LOADING', action: 'execute' },
      (request) => {
        const order = db.transportOrders.findOrFail(routeParam(request, 'no'))
        if (statusOf(db, order) !== 'confirmed') throw conflict(PLANNING_MESSAGES.loadingClosed)
        if (order.means === 'fleet') throw conflict(PLANNING_MESSAGES.loadingByDriver)
        const lineNo = Number(routeParam(request, 'lineNo'))
        const line = order.lines.find((item) => item.lineNo === lineNo)
        if (!line || !stillToLoad(line)) throw conflict(PLANNING_MESSAGES.loadingLineOut)
        if (line.loadedQuantity === null) throw conflict(PLANNING_MESSAGES.loadingNotDeclared)
        const next = apply(line, request)
        db.transportOrders.update(order.no, {
          lines: order.lines.map((item) => (item.lineNo === lineNo ? next : item)),
          ...stampModified(request)
        })
        const updated = db.transportOrders.findOrFail(order.no)
        return ok({ ready: loadingReady(updated.lines), status: statusOf(db, updated) })
      }
    )

  /* The driver checks his load compartment by compartment (TRS03-US05): one verdict for the
   * lines of a compartment, a reason when they do not conform; the other lines leave normally. */
  router.post('/me/orders/:no/check', { feature: 'MYSPACE', action: 'execute' }, (request) => {
    const order = driverOrder(db, routeParam(request, 'no'), request)
    if (statusOf(db, order) !== 'confirmed') throw conflict(PLANNING_MESSAGES.loadingClosed)
    assertLoadable(db, order)
    const body = readBody(request)
    const raw = body.lineNos
    if (!Array.isArray(raw) || !raw.length || raw.some((no) => !Number.isInteger(no))) {
      throw invalidField('lineNos')
    }
    const lineNos = raw as number[]
    const verdict = body.verdict
    if (verdict !== 'conform' && verdict !== 'nonconform') throw invalidField('verdict')
    const reason = verdict === 'nonconform' ? readReason(db, body, 'nonconformity') : null
    const targets = order.lines.filter((item) => lineNos.includes(item.lineNo))
    if (targets.length !== lineNos.length || targets.some((item) => !stillToLoad(item))) {
      throw conflict(PLANNING_MESSAGES.loadingLineOut)
    }
    if (targets.some((item) => item.loadedQuantity === null)) {
      throw conflict(PLANNING_MESSAGES.loadingNotDeclared)
    }
    const at = nowIsoDateTime()
    const lines = order.lines.map((item) => {
      if (!lineNos.includes(item.lineNo)) return item
      return reason
        ? {
            ...item,
            conformingAt: null,
            nonconformityAt: at,
            nonconformityReasonNo: reason.reasonNo,
            nonconformityComment: reason.comment
          }
        : {
            ...item,
            conformingAt: at,
            nonconformityAt: null,
            nonconformityReasonNo: null,
            nonconformityComment: ''
          }
    })
    db.transportOrders.update(order.no, { lines, ...stampModified(request) })
    const updated = db.transportOrders.findOrFail(order.no)
    return ok({ ready: loadingReady(updated.lines), status: statusOf(db, updated) })
  })

  check('conform', (line) => ({
    ...line,
    conformingAt: nowIsoDateTime(),
    nonconformityAt: null,
    nonconformityReasonNo: null,
    nonconformityComment: ''
  }))

  check('nonconform', (line, request) => {
    const reason = readReason(db, readBody(request), 'nonconformity')
    return {
      ...line,
      conformingAt: null,
      nonconformityAt: nowIsoDateTime(),
      nonconformityReasonNo: reason.reasonNo,
      nonconformityComment: reason.comment
    }
  })
}
