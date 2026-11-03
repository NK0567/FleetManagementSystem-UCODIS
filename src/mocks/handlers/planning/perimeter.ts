import { inPerimeter, type Place } from '@/modules/planning/reports/domain/indicators'
import type { MockDatabase } from '../../db/database'
import type { TransportOrderRow } from '../../fixtures/planning/transportOrders'

export function orderPlace(db: MockDatabase, order: TransportOrderRow): Place {
  const trip = order.tripNo ? db.trips.find(order.tripNo) : undefined
  const routeNo = trip?.routeTemplateNo ?? order.routeTemplateNo
  const route = routeNo ? db.routeTemplates.find(routeNo) : undefined
  const stopSiteNos = route?.stops.map((stop) => stop.siteNo) ?? []
  // The depot of the order is where it is loaded: another pickup site replaces the route's first stop.
  const siteNos = order.pickup?.siteNo
    ? [order.pickup.siteNo, ...stopSiteNos.slice(1)]
    : stopSiteNos
  const regions = siteNos
    .map((siteNo) => db.sites.find(siteNo)?.region ?? '')
    .filter((region) => region !== '')
  return { siteNos, regions }
}

export function requestPlace(db: MockDatabase, deliveryPointNo: string): Place {
  const point = db.deliveryPoints.find(deliveryPointNo)
  if (!point) return { siteNos: [], regions: [] }
  const sites = db.sites.all().filter((site) => site.city === point.city)
  return {
    siteNos: sites.map((site) => site.no),
    regions: sites.map((site) => site.region).filter((region) => region !== '')
  }
}

export function visibleTo(db: MockDatabase, userCode: string, place: Place): boolean {
  const perimeter = db.perimeters.find(userCode)
  return inPerimeter(
    perimeter ? { depotNos: perimeter.depotNos, regions: perimeter.regions } : null,
    place
  )
}
