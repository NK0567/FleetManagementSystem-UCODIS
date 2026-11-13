import type {
  DriverReportActionKind,
  DriverReportChannel,
  DriverReportKind,
  DriverReportSeverity,
  DriverReportStatus,
  DriverReportUrgency
} from '../domain/driverReport'

export interface DriverReportApi {
  no: string
  employeeNo: string
  employeeName: string
  subject: string
  kind: DriverReportKind
  severity: DriverReportSeverity
  urgency: DriverReportUrgency
  channel: DriverReportChannel
  occurredOn: string
  reportedOn: string
  description: string
  ownerName: string
  actionKind: DriverReportActionKind | ''
  actionText: string
  dueOn: string | null
  closedOn: string | null
  delayDays: number
  /** Reported within 24 hours of the facts. */
  within24h: boolean
  /** The action is past its due date and the report is not closed. */
  late: boolean
  status: DriverReportStatus
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type DriverReportSearchColumn = 'no' | 'employeeName' | 'subject' | 'no,employeeName,subject'
