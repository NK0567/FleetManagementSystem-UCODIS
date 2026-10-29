import {
  distanceToLegKm,
  plannedSchedule,
  routeDistanceKm
} from '@/modules/fleet/route-templates/domain/routeTemplate'
import type { RoutePlanApi } from '@/modules/planning/transport-orders/types/transportOrder.types'
import { distanceKm } from '@/utils/geo'
import type { MockDatabase } from '../../db/database'
import type { TransportOrderRow } from '../../fixtures/planning/transportOrders'

/** Width of the corridor around the route when the planner gives none, in kilometres. */
export const DEFAULT_CORRIDOR_KM = 5

/** The site type of the FMS register that marks a zone at risk. */
const RISK_ZONE_TYPE = 'RISK-ZONE'

/** A zone at risk this close to the route, its own extent added, is on the plan. */
export const RISK_ZONE_REACH_KM = 30

/**
 * The forecast trip plan of an order (TRS01-US11), drawn from its route template (TRS07-US03):
 * the stops with their role, the planned times, the maximum driving time from the previous stop
 * and the maximum stop, the zones at risk the corridor crosses, and the corridor itself, which the
 * FMS reads to detect a departure from the route.
 */
export function routePlanOf(
  db: MockDatabase,
  routeTemplateNo: string,
  departure: string | null,
  order: Pick<TransportOrderRow, 'corridorKm' | 'routePlanValidatedAt'>
): RoutePlanApi | null {
  const route = db.routeTemplates.find(routeTemplateNo)
  if (!route) return null
  const sites = route.stops.map((stop) => db.sites.find(stop.siteNo))
  const points = sites
    .filter((site): site is NonNullable<typeof site> => !!site)
    .map((site) => ({ latitude: site.latitude, longitude: site.longitude }))
  const schedule = departure ? plannedSchedule(departure, route.stops) : []
  const corridorKm = order.corridorKm ?? DEFAULT_CORRIDOR_KM
  const riskZones = db.sites
    .all()
    .filter((site) => site.siteTypeNo === RISK_ZONE_TYPE && site.active)
    .map((site) => {
      let nearest = Infinity
      for (let index = 1; index < points.length; index++) {
        nearest = Math.min(nearest, distanceToLegKm(site, points[index - 1]!, points[index]!))
      }
      return { siteNo: site.no, name: site.name, distanceKm: Math.round(nearest * 10) / 10 }
    })
    .filter((zone) => {
      const radiusKm = (db.sites.find(zone.siteNo)?.radiusM ?? 0) / 1000
      return zone.distanceKm <= RISK_ZONE_REACH_KM + radiusKm
    })
  return {
    routeTemplateNo: route.no,
    routeName: route.name,
    distanceKm: points.length > 1 ? routeDistanceKm(points, distanceKm) : route.estimatedDistanceKm,
    stops: route.stops.map((stop, index) => ({
      siteNo: stop.siteNo,
      siteName: sites[index]?.name ?? stop.siteNo,
      role: stop.role,
      plannedAt: schedule[index] ?? null,
      maxIntervalMin: index === 0 ? 0 : stop.plannedIntervalMin,
      maxStopMin: stop.breakMin
    })),
    drivingMin: route.stops.reduce(
      (total, stop, index) => total + (index === 0 ? 0 : stop.plannedIntervalMin),
      0
    ),
    restMin: route.stops.slice(0, -1).reduce((total, stop) => total + stop.breakMin, 0),
    riskZones,
    corridorKm,
    validatedAt: order.routePlanValidatedAt ?? null
  }
}
