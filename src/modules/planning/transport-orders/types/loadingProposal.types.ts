import type { LoadCapacity } from '@/modules/fleet/vehicles/domain/capacity'
import type { CompartmentUse } from '@/modules/fleet/vehicles/domain/compartments'
import type { LoadFill } from '../domain/transportOrder'

/** An order (commande) of the day, as the proposal places it. */
export interface ProposalRequestApi {
  no: string
  recipientName: string
  deliveryPointName: string
  region: string
  externalReference: string
  summary: string
  weightKg: number
  volumeM3: number
  liters: number
}

/** One vehicle of the proposal and the orders put on it (TRS01-US10). */
export interface ProposalVehicleApi {
  vehicleNo: string
  plate: string
  trailerNo: string | null
  trailerPlate: string
  /** Product categories the vehicle is kept for; empty takes any. */
  families: string[]
  capacity: LoadCapacity | null
  requests: ProposalRequestApi[]
  fill: LoadFill
  /** Products, quantities and recipients per compartment, as allocated. */
  compartments: CompartmentUse[]
  /** A rule the assignment breaks (compatibility, compartment, equipment, site): to correct. */
  issues: string[]
  /** An excess of capacity: warned, refused when the capacity check is strict. */
  warnings: string[]
}

export interface LoadingProposalApi {
  date: string
  vehicles: ProposalVehicleApi[]
  /** Orders no vehicle takes, with why. */
  unassigned: (ProposalRequestApi & { reason: string })[]
  /** What still waits for a vehicle, by product, until everything is assigned. */
  remaining: { productNo: string; productName: string; unit: string; quantity: number }[]
  /** The fleet's combinations free that day, to assign by hand. */
  available: { vehicleNo: string; trailerNo: string | null; label: string }[]
}

/** The assignment sent back after a correction by hand. */
export interface ProposalAssignment {
  vehicleNo: string
  trailerNo: string | null
  requestNos: string[]
}

/** Orders given to an external carrier, the other part of a combination (TRS01-US09). */
export interface ProposalCarrierGroup {
  carrierNo: string
  requestNos: string[]
}
