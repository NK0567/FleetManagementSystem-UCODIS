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

/** The planned arrival shifted by the delay taken, flagged above the margin. */
export function etaFrom(plannedArrival: string | null, delayMin: number | null) {
  return {
    expectedArrival:
      plannedArrival && delayMin ? addMinutes(plannedArrival, delayMin) : plannedArrival,
    delayMin,
    late: delayMin !== null && delayMin > LATE_AFTER_MIN
  }
}

/**
 * The estimated arrival follows the position of the vehicle (TRS02-US01): the planned arrival
 * shifted by the delay the vehicle has taken on its route, with the delay flagged.
 */
export function orderEta(db: MockDatabase, order: TransportOrderRow) {
  const item = transportOrdersApi(db).find((row) => row.no === order.no)
  const planned = item?.plannedArrival ?? null
  const trip = order.tripNo ? db.trips.find(order.tripNo) : undefined
  const positions = trip ? livePositions(db) : []
  const position = trip ? positions.find((row) => row.tripNo === trip.no) : undefined
  const delayMin = position?.delayMin ?? null
  // The vehicle's position comes from the FMS tracking, also before it leaves (TRS02-US01 CA01).
  const located = trip
    ? (position ?? positions.find((row) => row.vehicleNo === trip.vehicleNo))
    : undefined
  return {
    plannedArrival: planned,
    ...etaFrom(planned, delayMin),
    tracked: !!position,
    position: located
      ? {
          latitude: located.latitude,
          longitude: located.longitude,
          reportedAt: located.reportedAt,
          placeName: located.placeName,
          speedKmh: located.speedKmh,
          situation: located.situation,
          nextStopName: located.nextStopName,
          nextStopExpectedAt: located.nextStopExpectedAt,
          // The stops of the trip, to show the vehicle on its route.
          stops: (trip?.stops ?? []).flatMap((stop) => {
            const site = db.sites.find(stop.siteNo)
            return site
              ? [{ siteName: site.name, latitude: site.latitude, longitude: site.longitude }]
              : []
          })
        }
      : null
  }
}

export function registerEtaHandlers(router: MockRouter, db: MockDatabase): void {
  router.get(
    '/planning/transport-orders/:no/eta',
    { feature: 'TRANSPORTORDER', action: 'read' },
    (request) => ok(orderEta(db, db.transportOrders.findOrFail(routeParam(request, 'no'))))
  )
}
