export interface TechnicianApi {
  no: string
  competences: string[]
  active: boolean
  fullName: string
  jobPositionName: string
  competenceNames: string
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type TechnicianSearchColumn = 'no' | 'fullName' | 'no,fullName'
