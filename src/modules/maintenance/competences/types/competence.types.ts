export interface CompetenceApi {
  no: string
  name: string
  active: boolean
  /** Hourly labour rate of this specialty, null when the workshop's single rate applies. */
  hourlyRate: number | null
  technicianCount: number
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type CompetenceSearchColumn = 'no' | 'name' | 'no,name'
