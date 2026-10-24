export interface MissionTypeApi {
  no: string
  name: string
  isControl: boolean
  active: boolean
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type MissionTypeSearchColumn = 'no' | 'name' | 'no,name'
