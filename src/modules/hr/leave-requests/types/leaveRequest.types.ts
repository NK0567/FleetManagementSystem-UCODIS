import type { LeaveRequestStatus } from '../domain/leaveRequestStatus'

export interface LeaveRequestApi {
  no: string
  employeeNo: string
  employeeName: string
  orgUnitNo: string
  leaveTypeNo: string
  leaveTypeName: string
  startDate: string
  endDate: string
  /** Working days of the period, computed from the working calendar. */
  days: number
  status: LeaveRequestStatus
  reason: string
  submittedAt: string
  decisionComment: string
  decidedAt: string | null
  decidedBy: string | null
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type LeaveRequestSearchColumn = 'no' | 'employeeName' | 'no,employeeName'

export interface LeaveRequestSummary {
  pending: number
  approvedThisMonth: number
  absentToday: number
}
