import type { DrivingBreach } from '../domain/drivingTime'

/** The driving time of a trip and what it breaks of the limits set in the fleet settings. */
export interface TripDrivingTimeApi {
  tripNo: string
  driverNo: string
  /** From the passages at the stops once the trip has left, from its plan before. */
  source: 'actual' | 'planned'
  drivenMin: number
  breaches: DrivingBreach[]
}

/** The breaches of a driver over the last days, trip by trip. */
export interface DriverDrivingTimeApi {
  driverNo: string
  periodDays: number
  /** What the driver really drove over the period, whether or not a limit was broken. */
  drivenMin: number
  /** Trips of the period that count in drivenMin. */
  tripCount: number
  /** Only the trips that broke a limit. */
  trips: (TripDrivingTimeApi & { plannedDeparture: string; status: string })[]
}
