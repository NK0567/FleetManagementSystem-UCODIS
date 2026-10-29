import type { CheckResult } from '@/modules/fleet/check-points/domain/checkResult'

export const CHECKLIST_STAGES = ['departure', 'stop', 'arrival'] as const
export type ChecklistStage = (typeof CHECKLIST_STAGES)[number]

export interface RoadChecklistApi {
  /** The work order opened from this record, if any. */
  workOrderNo: string | null
  no: string
  tripNo: string
  stage: ChecklistStage
  takenAt: string
  /** Where the driver stopped to take it. */
  location?: string
  results: CheckResult[]
  vehicleNo: string
  vehiclePlate: string
  driverName: string
  /** When the driver of the trip signed it on his phone; null when unsigned. */
  signedAt: string | null
  signedBy?: string | null
  signed: boolean
  /** When it reached the server. */
  syncedAt: string
  /** Taken without network and sent once the network came back. */
  capturedOffline: boolean
  anomalyCount: number
  /** An anomaly on a blocking point keeps the vehicle from leaving. */
  blocking: boolean
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type RoadChecklistSearchColumn = 'no' | 'tripNo' | 'vehiclePlate' | 'no,tripNo,vehiclePlate'
