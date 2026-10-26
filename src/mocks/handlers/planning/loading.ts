import { stillToLoad, loadingReady } from '@/modules/planning/loading/domain/loading'
import { linesConfirmed } from '@/modules/planning/customer-confirmations/domain/confirmation'
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
import { PLANNING_MESSAGES } from './messages'
import { readReason } from './planningReasons'

function statusOf(db: MockDatabase, order: TransportOrderRow) {
  const trip = order.tripNo ? db.trips.find(order.tripNo) : undefined
  return transportOrderStatus({
    cancelledAt: order.cancelledAt,
    means: order.means,
    tripStatus: trip?.status ?? null,
    linesConfirmed: linesConfirmed(order.lines),
    loadingReady: loadingReady(order.lines)
  })
}

export function registerLoadingHandlers(router: MockRouter, db: MockDatabase): void {
  router.get('/planning/loading', { feature: 'LOADING', action: 'read' }, () => {
    const rows = []
    for (const order of db.transportOrders.all()) {
      if (statusOf(db, order) !== 'confirmed') continue
      for (const line of order.lines.filter(stillToLoad)) {
        rows.push({
          orderNo: order.no,
          lineNo: line.lineNo,
          productNo: line.productNo,
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
        quantities.has(line.lineNo) ? { ...line, loadedQuantity: quantities.get(line.lineNo) ?? null } : line
      )
      db.transportOrders.update(order.no, { lines, ...stampModified(request) })
      return ok(lines)
    }
  )

  const check = (name: string, apply: (line: TransportOrderRow['lines'][number], request: MockRequest) => TransportOrderRow['lines'][number]) =>
    router.post(
      `/planning/transport-orders/:no/lines/:lineNo/${name}`,
      { feature: 'LOADING', action: 'execute' },
      (request) => {
        const order = db.transportOrders.findOrFail(routeParam(request, 'no'))
        if (statusOf(db, order) !== 'confirmed') throw conflict(PLANNING_MESSAGES.loadingClosed)
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
