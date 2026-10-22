import type { LeaveRequestStatus } from '../../leave-requests/domain/leaveRequestStatus'

export interface PlanningLeave {
  no: string
  leaveTypeName: string
  status: LeaveRequestStatus
}

export interface PlanningDay {
  date: string
  dayOfWeek: number
  working: boolean
  start: string
  end: string
  hasBreak: boolean
  breakStart: string
  breakEnd: string
  minutes: number
  /** Name of the public holiday, when the day is one. */
  holiday: string | null
  leave: PlanningLeave | null
}

export interface MyPlanningApi {
  weekStart: string
  employeeName: string
  days: PlanningDay[]
}
