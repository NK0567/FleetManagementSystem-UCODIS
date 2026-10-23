import type { CheckResult } from '@/modules/fleet/check-points/domain/checkResult'

export const CHECKLIST_STAGES = ['departure', 'stop', 'arrival'] as const
export type ChecklistStage = (typeof CHECKLIST_STAGES)[number]

export interface RoadChecklistApi {
  no: string
  tripNo: string
  stage: ChecklistStage
  takenAt: string
  results: CheckResult[]
  vehicleNo: string
  vehiclePlate: string
  driverName: string
  anomalyCount: number
  /** An anomaly on a blocking point keeps the vehicle from leaving. */
  blocking: boolean
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type RoadChecklistSearchColumn = 'no' | 'tripNo' | 'vehiclePlate' | 'no,tripNo,vehiclePlate'
