import { nowIsoDateTime } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import type { TransportOrderLineRow } from '../../fixtures/planning/transportOrders'

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
      return {
        ...line,
        recipientMessages: [...(line.recipientMessages ?? []), { at, channel, kind }]
      }
    })
  })
}
