import type { DeliveryNoteApi } from '@/modules/planning/delivery-notes/types/deliveryNote.types'
import type { MockDatabase } from '../../db/database'
import type { TransportOrderRow } from '../../fixtures/planning/transportOrders'
import { routeParam } from '../../http/crudResource'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { vehiclePlates } from '../fleet/links'

/**
 * The electronic delivery note (TRS05-US03): one per delivery, that is the lines of an order
 * going to one delivery point. It opens with the driver's first declaration on that point,
 * lists what was delivered and, where it applies, the lines not delivered with their reason.
 * Only the recipient's confirmation signs it, with his name; until then it awaits him.
 */
export function deliveryNoteOf(
  db: MockDatabase,
  order: TransportOrderRow,
  deliveryPointNo: string,
  options: { planned?: boolean } = {}
): DeliveryNoteApi | null {
  const lines = order.lines.filter((line) => line.deliveryPointNo === deliveryPointNo)
  const declared = lines.filter((line) => line.declaredAt)
  // Before the declaration, the order card shows the note planned for each recipient once the
  // order is planned (TRS01-US23); the recipient's page shows it only once opened (TRS05-US03).
  const planned = !declared.length && options.planned && !!order.means && !order.cancelledAt
  if (!declared.length && !planned) return null
  const point = db.deliveryPoints.find(deliveryPointNo)
  const recipient = point ? db.customers.find(point.customerNo) : undefined
  const reasonName = (no: string | null | undefined) =>
    (no && db.planningReasons.find(no)?.name) || ''
  const trip = order.tripNo ? db.trips.find(order.tripNo) : undefined
  const plate = trip ? (vehiclePlates(db).get(trip.vehicleNo) ?? '') : order.carrierVehiclePlate
  const signed = declared.find((line) => line.receptionConfirmedAt)
  const contested = declared.find((line) => line.receptionContestedAt)
  return {
    orderNo: order.no,
    deliveryPointNo,
    deliveryPointName: point?.name ?? '',
    recipientName: recipient?.name ?? '',
    vehiclePlate: plate,
    openedAt: declared.map((line) => line.declaredAt!).sort()[0] ?? null,
    state: planned ? 'planned' : contested ? 'contested' : signed ? 'signed' : 'awaiting',
    signedAt: signed?.receptionConfirmedAt ?? null,
    signedBy: signed?.receptionConfirmedBy ?? '',
    contestedAt: contested?.receptionContestedAt ?? null,
    contestReason: reasonName(contested?.contestReasonNo),
    lines: lines
      // A line still on its way back or never loaded is not part of the delivery.
      .filter((line) => planned || line.declaredAt || line.refusalAt || line.postponedAt)
      .map((line) => {
        const product = db.products.find(line.productNo)
        return {
          lineNo: line.lineNo,
          productName: product?.name ?? line.productNo,
          unit: product?.unit ?? '',
          quantity: line.loadedQuantity ?? line.quantity,
          deliveredQuantity:
            line.declaredAt && !line.undeliveredReasonNo ? line.receivedQuantity : null,
          notDelivered: !planned && (!line.declaredAt || !!line.undeliveredReasonNo),
          reason: line.undeliveredReasonNo
            ? reasonName(line.undeliveredReasonNo)
            : line.refusalAt
              ? reasonName(line.refusalReasonNo)
              : line.postponedAt
                ? reasonName(line.postponementReasonNo)
                : '',
          measures: line.deliveryMeasures ?? null
        }
      })
  }
}

export function deliveryNotesOf(db: MockDatabase, order: TransportOrderRow): DeliveryNoteApi[] {
  const points = [...new Set(order.lines.map((line) => line.deliveryPointNo))]
  return points
    .map((point) => deliveryNoteOf(db, order, point, { planned: true }))
    .filter((note): note is DeliveryNoteApi => note !== null)
}

export function registerDeliveryNotesHandlers(router: MockRouter, db: MockDatabase): void {
  /* The planner reads the notes from the order card (TRS05-US03); the driver never does. */
  router.get(
    '/planning/transport-orders/:no/delivery-notes',
    { feature: 'TRANSPORTORDER', action: 'read' },
    (request) => ok(deliveryNotesOf(db, db.transportOrders.findOrFail(routeParam(request, 'no'))))
  )
}
