export const FIELD_ROLES = ['driver', 'assistant'] as const
export type FieldRole = (typeof FIELD_ROLES)[number]

/** The assistant reads the tour. Only the driver declares. */
export function mayDeclare(role: FieldRole): boolean {
  return role === 'driver'
}

export interface TourCandidate {
  status: string
  plannedDeparture: string
}

/** The tour on the road, otherwise the next planned one, otherwise the latest finished one. */
export function pickTour<T extends TourCandidate>(trips: readonly T[]): T | null {
  const byDeparture = (direction: 1 | -1) => (a: T, b: T) =>
    direction * a.plannedDeparture.localeCompare(b.plannedDeparture)
  const current = trips.filter((trip) => trip.status === 'in_progress').sort(byDeparture(1))
  if (current[0]) return current[0]
  const next = trips.filter((trip) => trip.status === 'planned').sort(byDeparture(1))
  if (next[0]) return next[0]
  const past = trips
    .filter((trip) => trip.status === 'completed' || trip.status === 'closed')
    .sort(byDeparture(-1))
  return past[0] ?? null
}

/** Where a delivery sits on the route: the stop in the same city, or after the last stop. */
export function stopRank(city: string, stopCities: readonly string[]): number {
  const index = stopCities.findIndex((stopCity) => stopCity === city)
  return index === -1 ? stopCities.length : index
}
