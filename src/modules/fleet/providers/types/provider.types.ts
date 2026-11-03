export const PROVIDER_TYPES = [
  'garage',
  'parts_supplier',
  'tyre_supplier',
  'fuel_supplier',
  'insurer',
  'manufacturer',
  'bank',
  'carrier'
] as const
export type ProviderType = (typeof PROVIDER_TYPES)[number]

export type ProviderSource = 'fms' | 'management_system'

export interface ProviderContract {
  /** Numbered by the server when the contract is added. */
  reference: string
  subject: string
  startDate: string
  endDate: string | null
  amount: number | null
}

/** A vehicle of an external carrier: what the planner picks once the carrier is chosen. */
export interface CarrierVehicle {
  plate: string
  description: string
  /** What the vehicle can carry, compared with the load of an order (TRS01-US08, US09). */
  maxLoadKg?: number | null
  maxVolumeM3?: number | null
  /** The tank volume of a tanker, in litres. */
  capacityL?: number | null
}

export interface ProviderApi {
  no: string
  name: string
  /** Code of a provider type; the application's own types keep their role as code. */
  providerType: string
  providerTypeName: string
  /** Typed in the fleet, or taken from the company management system. */
  source: ProviderSource
  externalId: string | null
  contactName: string
  phone: string
  email: string
  address: string
  authorized: boolean
  notAuthorizedReason: string
  contracts: ProviderContract[]
  /** Only for a carrier: the means of transport attached to it. */
  carrierVehicles: CarrierVehicle[]
  activeContractCount: number
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type ProviderSearchColumn = 'no' | 'name' | 'contactName' | 'no,name,contactName'

/** What a resumption from the company management system did. */
export interface ProviderSyncReport {
  created: string[]
  updated: string[]
  unchanged: number
  skipped: { externalId: string; reason: string }[]
}
