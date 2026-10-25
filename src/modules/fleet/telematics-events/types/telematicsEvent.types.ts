import type {
  TelematicsFamily,
  TelematicsSeverity,
  TelematicsUnit
} from '@/modules/fleet/telematics-event-types'
import type { TelematicsEventStatus } from '../domain/telematicsEvent'

export const TELEMATICS_SOURCES = ['box', 'camera', 'obd', 'gps'] as const
export type TelematicsSource = (typeof TELEMATICS_SOURCES)[number]

export interface TelematicsEventApi {
  /** The work order opened from this record, if any. */
  workOrderNo: string | null
  no: string
  eventTypeNo: string
  vehicleNo: string
  driverNo: string | null
  tripNo: string | null
  occurredAt: string
  source: TelematicsSource
  value: number | null
  latitude: number | null
  longitude: number | null
  detail: string
  infractionNo: string | null
  acknowledgedAt: string | null
  acknowledgedBy: string | null
  acknowledgementComment: string
  eventTypeName: string
  vehiclePlate: string
  driverName: string
  /** The site whose area holds the position, if any. */
  siteName: string
  family: TelematicsFamily
  severity: TelematicsSeverity
  unit: TelematicsUnit | null
  /** An infraction can be opened only when the type names one. */
  infractionTypeNo: string | null
  status: TelematicsEventStatus
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type TelematicsEventSearchColumn =
  | 'no'
  | 'vehiclePlate'
  | 'driverName'
  | 'siteName'
  | 'no,vehiclePlate,driverName,siteName'
