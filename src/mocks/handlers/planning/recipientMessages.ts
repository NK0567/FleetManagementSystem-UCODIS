import { nowIsoDateTime } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import type { TransportOrderLineRow } from '../../fixtures/planning/transportOrders'

/**
 * Where the recipient is reached: the phone or the e-mail given on the order (commande) itself,
 * else those of his customer record; the e-mail for the e-mail channel, the phone otherwise.
 */
export function recipientContact(
  db: MockDatabase,
  requestNo: string | null,
  deliveryPointNo: string,
  channel: string
): string {
  const request = requestNo ? db.deliveryRequests.find(requestNo) : null
  const point = db.deliveryPoints.find(deliveryPointNo)
  const customer = point ? db.customers.find(point.customerNo) : undefined
  return channel === 'email'
    ? request?.recipientEmail || customer?.email || ''
    : request?.recipientPhone || customer?.phone || ''
}

export type RecipientMessageKind = 'planned' | 'started' | 'declared'

/**
 * The recipient is told automatically, on the channel of his order, when his delivery is
 * planned, when its order starts and when the driver declares it (TRS02-US02). The mock has
 * no gateway: each message is kept on the line, and his page lists them. No channel, no message.
 */
export function messageRecipients(
  db: MockDatabase,
  orderNo: string,
  kind: RecipientMessageKind,
  only?: (line: TransportOrderLineRow) => boolean
): void {
  const order = db.transportOrders.find(orderNo)
  if (!order) return
  const at = nowIsoDateTime()
  db.transportOrders.update(order.no, {
    lines: order.lines.map((line) => {
      if (only && !only(line)) return line
      const request = line.deliveryRequestNo
        ? db.deliveryRequests.find(line.deliveryRequestNo)
        : null
      const point = db.deliveryPoints.find(line.deliveryPointNo)
      const customer = point ? db.customers.find(point.customerNo) : undefined
      const channel = request?.notificationChannel ?? customer?.notificationChannel ?? 'sms'
      if (channel === 'none') return line
      const to = recipientContact(db, line.deliveryRequestNo, line.deliveryPointNo, channel)
      return {
        ...line,
        recipientMessages: [...(line.recipientMessages ?? []), { at, channel, kind, to }]
      }
    })
  })
}
