import type { FleetState, FleetStateGroup } from '../domain/fleetState'

/** One line of the daily fleet status: a vehicle with what it is doing on that day. */
export interface FleetStatusApi {
  /** Number of the vehicle. */
  no: string
  plate: string
  vehicleTypeName: string
  trailerPlate: string
  driverName: string
  state: FleetState
  stateGroup: FleetStateGroup
  tripNo: string | null
  /** Transport orders carried by the trip. */
  orderNos: string[]
  mission: string
  location: string
  /** Where the tracked vehicle is now: the site holding it, or its coordinates. */
  position?: string
  immobilizationReason: string
  observation: string
  expectedBackOn: string | null
}

export type FleetStatusSearchColumn = 'no' | 'plate' | 'driverName' | 'no,plate,driverName'

export interface FleetStatusDay {
  date: string
  /** True when the day is today: the lines are live and the notes can change. */
  live: boolean
  archivedAt: string | null
  archivedBy: string | null
}

/** A sending of the fleet status by e-mail, as recorded by the demonstration. */
export interface FleetStatusDispatchApi {
  no: string
  date: string
  recipients: string[]
  subject: string
  lineCount: number
  sentAt: string
  sentBy: string
}
