export interface LeaveTypeApi {
  no: string
  name: string
  /** Colour used for this type in calendars, chosen by the user. */
  color: string
  /** Required by law: cannot be disabled or deleted. */
  statutory: boolean
  active: boolean
  /** Days per year; annual leave takes the employee category entitlement instead. */
  annualEntitlementDays: number | null
  monthlyAccrualDays: number | null
  maxCarryOverDays: number | null
  noticeDays: number
  requiresDocument: boolean
  paid: boolean
  /** Shown in the leave balances. */
  tracksBalance: boolean
  comment: string
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type LeaveTypeSearchColumn = 'no' | 'name' | 'no,name'

/** The annual leave type, whose entitlement comes from the employee category. */
export const ANNUAL_LEAVE_TYPE_NO = 'CA'
