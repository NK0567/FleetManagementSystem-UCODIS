export interface CompanySettingsApi {
  legalName: string
  entityName: string
  activity: string
  address: string
  country: string
  /** NIF and STAT numbers of the company. */
  taxId: string
  /** Counted from the vehicles in service, never typed. */
  tractorCount: number
  trailerCount: number
  vehicleCount: number
  modifiedAt: string
  modifiedBy: string
}

export type CompanySettingsInput = Pick<
  CompanySettingsApi,
  'legalName' | 'entityName' | 'activity' | 'address' | 'country' | 'taxId'
>
