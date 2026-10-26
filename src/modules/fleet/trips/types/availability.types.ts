import type { LoadCapacity } from '../../vehicles/domain/capacity'

export interface ResourceAvailabilityApi {
  no: string
  label: string
  role: 'motorized' | 'towed' | 'driver'
  capacity: LoadCapacity | null
  available: boolean
  reasons: string[]
}

/** Vehicles and drivers of the park over a time window, free or not and why. */
export interface AvailabilityApi {
  from: string
  to: string
  vehicles: ResourceAvailabilityApi[]
  drivers: ResourceAvailabilityApi[]
}
