export const ORG_UNIT_TYPES = ['directorate', 'department', 'team'] as const
export type OrgUnitType = (typeof ORG_UNIT_TYPES)[number]

export const ORG_UNIT_STATUSES = ['validated', 'pending_validation'] as const
export type OrgUnitStatus = (typeof ORG_UNIT_STATUSES)[number]

export interface OrgUnitApi {
  no: string
  name: string
  type: OrgUnitType
  parentNo: string | null
  parentName: string
  managerNo: string | null
  managerName: string
  siteCode: string
  description: string
  status: OrgUnitStatus
  submittedAt: string | null
  validatedAt: string | null
  validatedBy: string | null
  /** Active employees attached directly to the unit. */
  headcount: number
  /** Active employees of the unit and all its sub-units. */
  totalHeadcount: number
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type OrgUnitSearchColumn = 'no' | 'name' | 'no,name'
