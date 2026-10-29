import { addMinutes } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import type { TransportOrderRow } from '../../fixtures/planning/transportOrders'
import { routeParam } from '../../http/crudResource'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { livePositions } from '../fleet/livePositions'
import { transportOrdersApi } from './transportOrders'

/** Above this delay the arrival is flagged late. */
const LATE_AFTER_MIN = 15

/**
 * The estimated arrival follows the position of the vehicle (TRS02-US01): the planned arrival
 * shifted by the delay the vehicle has taken on its route, with the delay flagged.
 */
export function orderEta(db: MockDatabase, order: TransportOrderRow) {
  const item = transportOrdersApi(db).find((row) => row.no === order.no)
  const planned = item?.plannedArrival ?? null
  const trip = order.tripNo ? db.trips.find(order.tripNo) : undefined
  const position = trip ? livePositions(db).find((row) => row.tripNo === trip.no) : undefined
  const delayMin = position?.delayMin ?? null
  return {
    plannedArrival: planned,
    expectedArrival: planned && delayMin ? addMinutes(planned, delayMin) : planned,
    delayMin,
    late: delayMin !== null && delayMin > LATE_AFTER_MIN,
    tracked: !!position
  }
}

export function registerEtaHandlers(router: MockRouter, db: MockDatabase): void {
  router.get(
    '/planning/transport-orders/:no/eta',
    { feature: 'TRANSPORTORDER', action: 'read' },
    (request) => ok(orderEta(db, db.transportOrders.findOrFail(routeParam(request, 'no'))))
  )
}
