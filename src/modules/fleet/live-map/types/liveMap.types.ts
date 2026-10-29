import type { LiveSituation } from '../domain/livePosition'

export interface LiveStopApi {
  siteName: string
  latitude: number
  longitude: number
  plannedAt: string
  /** The real arrival once passed, the estimate before. */
  expectedAt: string
  passed: boolean
}

export interface LivePositionApi {
  vehicleNo: string
  plate: string
  driverName: string
  tripNo: string | null
  routeName: string
  situation: LiveSituation
  latitude: number
  longitude: number
  speedKmh: number
  /** When the unit last reported; older than now when the signal is lost. */
  reportedAt: string
  /** The site whose area holds the vehicle, if any. */
  placeName: string
  nextStopName: string
  nextStopExpectedAt: string | null
  /** Expected delay at the end of the trip; negative when ahead. */
  delayMin: number | null
  /** Deviation and telematics alerts of the vehicle not handled yet. */
  alertCount: number
  /** On a trip, farther from its road than the corridor; off a trip, outside a site or in a restricted one. */
  outOfZone: boolean
  /** Distance to the road of the trip, in metres; null off a trip. */
  corridorGapM: number | null
  stops: LiveStopApi[]
}

/** One recorded position of a replayed history. */
export interface TrackHistoryPoint {
  at: string
  latitude: number
  longitude: number
  speedKmh: number
  tripNo: string
  /** The site whose area holds the position, if any. */
  placeName: string
}

export interface TrackHistoryApi {
  vehicleNo: string
  plate: string
  from: string
  to: string
  tripNos: string[]
  points: TrackHistoryPoint[]
  /** Telematics events and deviations of the vehicle over the same period. */
  eventCount: number
}

/** One line of the telematics journal of a vehicle: an event of a unit or a deviation found. */
export interface VehicleJournalEntry {
  kind: 'telematics' | 'deviation'
  no: string
  at: string
  /** The family of the telematics event type, or « deviation ». */
  family: string
  typeName: string
  severity: string
  value: number | null
  unit: string | null
  place: string
  detail: string
  tripNo: string | null
  driverName: string
  /** Status of the event, or nature of the deviation. */
  status: string
}

export interface VehicleJournalApi {
  vehicleNo: string
  from: string
  to: string
  entries: VehicleJournalEntry[]
}
