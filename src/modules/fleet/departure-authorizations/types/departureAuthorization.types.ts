import type { CheckResult } from '@/modules/fleet/check-points'
import type { DepartureCheck, DepartureDecision } from '../domain/departure'

export interface DepartureAuthorizationApi {
  no: string
  tripNo: string
  driverChecks: CheckResult[]
  decision: DepartureDecision
  decidedBy: string | null
  decidedAt: string | null
  refusalReason: string
  /** Checks as they stood when the decision was taken. */
  checksSnapshot: DepartureCheck[] | null
  plannedDeparture: string
  vehicleNo: string
  vehiclePlate: string
  trailerPlate: string
  driverNo: string
  driverName: string
  /** Live while pending, frozen once decided. */
  checks: DepartureCheck[]
  ready: boolean
  checklistNo: string | null
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type DepartureAuthorizationSearchColumn =
  | 'no'
  | 'tripNo'
  | 'vehiclePlate'
  | 'driverName'
  | 'no,tripNo,vehiclePlate,driverName'
