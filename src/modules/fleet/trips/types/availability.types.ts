import type { LoadCapacity } from '../../vehicles/domain/capacity'

export interface ResourceAvailabilityApi {
  no: string
  label: string
  role: 'motorized' | 'towed' | 'driver'
  capacity: LoadCapacity | null
  available: boolean
  reasons: string[]
  /** Only held by another trip at that time: an overlap the planner may accept. */
  busyOnly: boolean
  /** For a motorized vehicle: the driver assigned to it, proposed by default. */
  assignedDriverNo?: string | null
}

/** Vehicles and drivers of the park over a time window, free or not and why. */
export interface AvailabilityApi {
  from: string
  to: string
  vehicles: ResourceAvailabilityApi[]
  drivers: ResourceAvailabilityApi[]
}
