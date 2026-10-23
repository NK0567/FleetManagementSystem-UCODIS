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
  active: boolean
  stops: RouteStop[]
  stopPoints: RouteStopPoint[]
  originName: string
  destinationName: string
  stopCount: number
  plannedDurationMin: number
  tripCount: number
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type RouteTemplateSearchColumn = 'no' | 'name' | 'no,name'
