import type { EmployeeStatus } from '@/modules/hr/employees'
import type { DriverAvailability } from '../domain/driver'
import type { FamilyScore } from '../domain/driverScore'

export interface DriverAssignmentSummary {
  no: string
  vehicleNo: string
  vehiclePlate: string
  startDate: string
  endDate: string | null
}

/** A fleet view of an HR employee whose position involves driving. */
export interface DriverApi {
  no: string
  fullName: string
  jobPositionNo: string
  jobPositionName: string
  phone: string
  siteCode: string
  siteName: string
  employeeStatus: EmployeeStatus
  drivingAuthorized: boolean
  vehicleNo: string | null
  vehiclePlate: string
  assignedSince: string | null
  availability: DriverAvailability
  eligible: boolean
  documentsCompliant: boolean
  /** Mandatory documents missing or past their validity, named in the language of the request. */
  documentGaps: string
  /** Why the driver cannot be given a vehicle, in the language of the request. */
  ineligibilityReasons: string
  assignments: DriverAssignmentSummary[]
  score: number
  /** Change since the end of last month. */
  scoreDelta: number
  modifiedAt: string
  modifiedBy: string
}

export type DriverSearchColumn =
  | 'no'
  | 'fullName'
  | 'phone'
  | 'vehiclePlate'
  | 'no,fullName,phone,vehiclePlate'

export interface DriverScoreApi {
  driverNo: string
  fullName: string
  score: number
  /** The score at the end of last month, from the events dated until then. */
  previousScore: number
  delta: number
  /** 1 for the best score; drivers with the same score share their rank. */
  rank: number
  driverCount: number
  threshold: number
  belowThreshold: boolean
  families: FamilyScore[]
  /** The score training still to come, if one was proposed. */
  trainingNo: string | null
}
