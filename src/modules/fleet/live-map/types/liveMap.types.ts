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
  stops: LiveStopApi[]
}
