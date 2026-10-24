export const DOWNTIME_FAMILIES = ['technical', 'regulatory', 'administrative', 'human'] as const
export type DowntimeFamily = (typeof DOWNTIME_FAMILIES)[number]

export const DOWNTIME_ROLES = ['breakdown', 'preventive', 'accident'] as const
export type DowntimeRole = (typeof DOWNTIME_ROLES)[number]

export interface DowntimeCodeApi {
  no: string
  name: string
  family: DowntimeFamily
  systemRole: DowntimeRole | null
  active: boolean
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type DowntimeCodeSearchColumn = 'no' | 'name' | 'no,name'
