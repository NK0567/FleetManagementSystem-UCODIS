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

export interface ProviderContract {
  /** Numbered by the server when the contract is added. */
  reference: string
  subject: string
  startDate: string
  endDate: string | null
  amount: number | null
}

export interface ProviderApi {
  no: string
  name: string
  providerType: ProviderType
  contactName: string
  phone: string
  email: string
  address: string
  authorized: boolean
  notAuthorizedReason: string
  contracts: ProviderContract[]
  activeContractCount: number
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type ProviderSearchColumn = 'no' | 'name' | 'contactName' | 'no,name,contactName'
