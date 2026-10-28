export interface AlertRuleApi {
  no: string
  name: string
  recipients: string[]
  escalationHours: number
  escalateTo: string
  active: boolean
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type AlertRuleSearchColumn = 'no' | 'name' | 'no,name'
