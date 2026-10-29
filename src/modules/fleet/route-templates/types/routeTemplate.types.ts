import type { RouteStop } from '../domain/routeTemplate'

/** A stop with the place it stands for, to draw the route. */
export interface RouteStopPoint extends RouteStop {
  siteName: string
  latitude: number
  longitude: number
}

export interface RouteTemplateApi {
  no: string
  name: string
  recurring: boolean
  estimatedDistanceKm: number
  /** Usual consumption on this route, in L/100 km; it comes first when judging a refill period. */
  fuelReferenceL100: number | null
  active: boolean
  stops: RouteStop[]
  stopPoints: RouteStopPoint[]
  originName: string
  destinationName: string
  stopCount: number
  plannedDurationMin: number
  /** Reference time: the distance driven at the average speed, plus the stops (TRS07-US03). */
  referenceDurationMin: number
  tripCount: number
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type RouteTemplateSearchColumn = 'no' | 'name' | 'no,name'
