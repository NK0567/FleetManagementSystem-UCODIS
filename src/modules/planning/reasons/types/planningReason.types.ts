export const PLANNING_REASON_KINDS = [
  'cancellation',
  'request_rejection',
  'delivery_refusal',
  'unavailability',
  'nonconformity',
  'postponement',
  'contestation'
] as const
export type PlanningReasonKind = (typeof PLANNING_REASON_KINDS)[number]

export interface PlanningReasonApi {
  no: string
  name: string
  kind: PlanningReasonKind
  active: boolean
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type PlanningReasonSearchColumn = 'no' | 'name' | 'no,name'
