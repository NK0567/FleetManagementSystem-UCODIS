export interface FuelGapCauseApi {
  no: string
  name: string
  chargeable: boolean
  active: boolean
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type FuelGapCauseSearchColumn = 'no' | 'name' | 'no,name'
