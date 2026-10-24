import type { DowntimeFamily } from '@/modules/maintenance/downtime-codes/types/downtimeCode.types'
import type { DowntimeOrigin, DowntimeStatus } from '../domain/downtime'

export interface DowntimeApi {
  no: string
  vehicleNo: string
  downtimeCodeNo: string
  origin: DowntimeOrigin
  startedAt: string
  comment: string
  endedAt: string | null
  endedBy: string | null
  endComment: string
  vehiclePlate: string
  downtimeCodeName: string
  family: DowntimeFamily
  /** Days without the vehicle, to the hundredth, until now while open. */
  durationDays: number
  cost: number
  status: DowntimeStatus
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type DowntimeSearchColumn =
  | 'no'
  | 'vehiclePlate'
  | 'downtimeCodeName'
  | 'no,vehiclePlate,downtimeCodeName'
