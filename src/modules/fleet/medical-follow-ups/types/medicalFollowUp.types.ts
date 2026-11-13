import type {
  MedicalFollowUpKind,
  MedicalFollowUpResult,
  MedicalFollowUpStatus
} from '../domain/medicalFollowUp'

export interface MedicalFollowUpApi {
  no: string
  employeeNo: string
  employeeName: string
  kind: MedicalFollowUpKind
  doneOn: string
  result: MedicalFollowUpResult
  provider: string
  nextDueOn: string | null
  lostDays: number | null
  followUp: string
  /** The renewal date is past: the driver is no longer covered. */
  overdue: boolean
  /** The renewal falls within the next 30 days. */
  dueSoon: boolean
  status: MedicalFollowUpStatus
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type MedicalFollowUpSearchColumn =
  | 'no'
  | 'employeeName'
  | 'provider'
  | 'no,employeeName,provider'
