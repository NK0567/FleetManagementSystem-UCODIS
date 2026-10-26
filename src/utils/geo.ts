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

export interface GeoCircle extends GeoPoint {
  radiusM: number
}

/** The circle holding the point; the closest centre wins when circles overlap. */
export function circleContaining<T extends GeoCircle>(
  point: GeoPoint,
  circles: readonly T[]
): T | undefined {
  return circles
    .map((circle) => ({ circle, km: distanceKm(point, circle) }))
    .filter((item) => item.km * 1000 <= item.circle.radiusM)
    .sort((a, b) => a.km - b.km)[0]?.circle
}

/** The point a fraction of the way from a to b; fine over the length of a road leg. */
export function pointBetween(a: GeoPoint, b: GeoPoint, fraction: number): GeoPoint {
  const t = Math.min(1, Math.max(0, fraction))
  return {
    latitude: a.latitude + (b.latitude - a.latitude) * t,
    longitude: a.longitude + (b.longitude - a.longitude) * t
  }
}
