export const TRIP_STATUSES = ['planned', 'in_progress', 'completed', 'closed', 'cancelled'] as const
export type TripStatus = (typeof TRIP_STATUSES)[number]

export type TripAction = 'edit' | 'start' | 'passStop' | 'complete' | 'close' | 'cancel'

const ALLOWED_FROM: Record<TripAction, readonly TripStatus[]> = {
  edit: ['planned'],
  start: ['planned'],
  passStop: ['in_progress'],
  complete: ['in_progress'],
  close: ['completed'],
  cancel: ['planned']
}

/** The life of a trip: planned, then on the road, completed, and closed once checked. */
export function canApply(action: TripAction, status: TripStatus): boolean {
  return ALLOWED_FROM[action].includes(status)
}

/** Trips that hold their vehicle, trailer and driver. */
export const OPEN_TRIP_STATUSES: readonly TripStatus[] = ['planned', 'in_progress']

export interface TimeWindow {
  start: string
  /** Open-ended while the trip is on the road. */
  end: string | null
}

export function windowsOverlap(a: TimeWindow, b: TimeWindow): boolean {
  return (a.end === null || b.start < a.end) && (b.end === null || a.start < b.end)
}

/** Gap between the distance driven and the reference distance of the route, in percent. */
export function kmGapPercent(distanceKm: number | null, referenceKm: number): number | null {
  if (distanceKm === null || referenceKm <= 0) return null
  return Math.round(((distanceKm - referenceKm) / referenceKm) * 1000) / 10
}

/** The next stop still to pass, the last one excepted: reaching it completes the trip. */
export function nextStopIndex(stops: readonly { passedAt: string | null }[]): number | null {
  const index = stops.findIndex((stop) => stop.passedAt === null)
  return index === -1 || index === stops.length - 1 ? null : index
}

/**
 * Stops the vehicle went past without serving them: a stop left behind once a later one is
 * passed, and, once the trip has reached its destination, every stop never passed.
 */
export function missedStopCount(
  stops: readonly { passedAt: string | null }[],
  status: TripStatus
): number {
  const finished = status === 'completed' || status === 'closed'
  return stops.filter(
    (stop, index) =>
      stop.passedAt === null &&
      (finished || stops.slice(index + 1).some((later) => later.passedAt !== null))
  ).length
}
