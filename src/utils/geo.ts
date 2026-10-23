export interface GeoPoint {
  latitude: number
  longitude: number
}

const EARTH_RADIUS_KM = 6371

const radians = (degrees: number) => (degrees * Math.PI) / 180

/** Great-circle distance between two points, in kilometres: the only distance formula of the app. */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = radians(b.latitude - a.latitude)
  const dLon = radians(b.longitude - a.longitude)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}
