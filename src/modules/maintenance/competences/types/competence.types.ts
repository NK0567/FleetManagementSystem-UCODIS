export interface CompetenceApi {
  no: string
  name: string
  active: boolean
  technicianCount: number
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type CompetenceSearchColumn = 'no' | 'name' | 'no,name'
