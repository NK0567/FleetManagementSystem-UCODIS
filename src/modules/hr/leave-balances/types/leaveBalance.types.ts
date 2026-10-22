export interface LeaveBalanceApi {
  /** employeeNo-leaveTypeNo-year */
  no: string
  employeeNo: string
  employeeName: string
  orgUnitNo: string
  leaveTypeNo: string
  leaveTypeName: string
  year: number
  entitlementDays: number
  carriedOverDays: number
  adjustmentDays: number
  takenDays: number
  pendingDays: number
  remainingDays: number
  availableDays: number
}

export type LeaveBalanceSearchColumn = 'employeeName' | 'employeeNo' | 'employeeNo,employeeName'
