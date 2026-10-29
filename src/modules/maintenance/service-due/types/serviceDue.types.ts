import type { OperationNature } from '@/modules/maintenance/maintenance-plans/domain/maintenancePlan'
import type { ServiceDueStatus } from '../domain/serviceDue'

/** One operation of a plan for one vehicle; `no` joins the two. */
export interface ServiceDueApi {
  no: string
  vehicleNo: string
  vehiclePlate: string
  planNo: string
  planName: string
  provisional: boolean
  operationNo: string
  operationLabel: string
  subsystemName: string
  nature: OperationNature
  intervalKm: number | null
  intervalHours: number | null
  intervalDays: number | null
  lastKm: number | null
  lastHours: number | null
  lastDate: string | null
  /** Current hour meter of the vehicle, when it has one. */
  currentHours: number | null
  nextKm: number | null
  nextHours: number | null
  nextDate: string | null
  kmRemaining: number | null
  hoursRemaining: number | null
  daysRemaining: number | null
  status: ServiceDueStatus
  /** The open preventive order that already covers it. */
  openOrderNo: string | null
}

export type ServiceDueSearchColumn =
  | 'vehiclePlate'
  | 'operationLabel'
  | 'planName'
  | 'vehiclePlate,operationLabel,planName'
