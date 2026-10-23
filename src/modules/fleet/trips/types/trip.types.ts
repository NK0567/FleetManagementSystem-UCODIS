import type { StopRole } from '@/modules/fleet/route-templates'
import type { TripStatus } from '../domain/trip'

export interface TripStopApi {
  siteNo: string
  siteName: string
  role: StopRole
  latitude: number
  longitude: number
  plannedAt: string
  passedAt: string | null
}

export interface TripApi {
  no: string
  routeTemplateNo: string
  routeName: string
  originName: string
  destinationName: string
  vehicleNo: string
  vehiclePlate: string
  trailerNo: string | null
  trailerPlate: string
  driverNo: string
  driverName: string
  plannedDeparture: string
  plannedArrival: string
  actualDeparture: string | null
  actualArrival: string | null
  startOdometerKm: number | null
  endOdometerKm: number | null
  /** Road distance of the route when the trip was planned. */
  referenceKm: number
  distanceKm: number | null
  kmGapPercent: number | null
  /** Minutes late at arrival; negative when early. */
  arrivalDelayMin: number | null
  status: TripStatus
  cancelReason: string
  closedAt: string | null
  closedBy: string | null
  cancelledAt: string | null
  cancelledBy: string | null
  stops: TripStopApi[]
  stopCount: number
  passedStopCount: number
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type TripSearchColumn = 'no' | 'vehiclePlate' | 'driverName' | 'no,vehiclePlate,driverName'
