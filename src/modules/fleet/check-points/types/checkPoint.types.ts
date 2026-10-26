export const CHECK_POINT_SCOPES = ['vehicle', 'driver'] as const
export type CheckPointScope = (typeof CHECK_POINT_SCOPES)[number]

export interface CheckPointApi {
  no: string
  label: string
  scope: CheckPointScope
  blocking: boolean
  sortOrder: number
  active: boolean
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type CheckPointSearchColumn = 'no' | 'label' | 'no,label'
