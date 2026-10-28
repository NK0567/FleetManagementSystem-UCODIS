import type { LeaveRequestStatus } from '../../leave-requests/domain/leaveRequestStatus'

export interface DashboardLeave {
  no: string
  employeeNo: string
  employeeName: string
  leaveTypeName: string
  startDate: string
  endDate: string
  days: number
  status: LeaveRequestStatus
}

export interface HrDashboardApi {
  headcount: {
    onStaff: number
    drivers: number
    onLeave: number
    suspended: number
  }
  leave: {
    pending: number
    approvedThisMonth: number
    absentToday: number
    /** Oldest first: the ones waiting longest come first. */
    pendingRequests: DashboardLeave[]
    /** Approved leave running today or starting within the next two weeks. */
    upcoming: DashboardLeave[]
  }
  attention: {
    pendingOrgUnits: { no: string; name: string }[]
    unauthorizedDrivers: { no: string; fullName: string }[]
    understaffedPositions: { no: string; name: string; headcountGap: number }[]
  }
  headcountByUnit: { no: string; name: string; headcount: number }[]
}
