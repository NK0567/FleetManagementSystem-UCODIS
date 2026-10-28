import type { DeviationSeverity, DeviationUnit } from '@/modules/fleet/deviation-types'
import type {
  DeviationNature,
  DeviationQualification,
  DeviationSource
} from '../domain/routeDeviation'

export interface RouteDeviationApi {
  no: string
  tripNo: string
  deviationTypeNo: string
  severity: DeviationSeverity
  source: DeviationSource
  detectedAt: string
  endedAt: string | null
  measure: number | null
  location: string
  latitude: number | null
  longitude: number | null
  justification: string
  justifiedAt: string | null
  justifiedBy: string | null
  qualification: DeviationQualification | null
  deviationTypeName: string
  unit: DeviationUnit | null
  vehiclePlate: string
  driverName: string
  nature: DeviationNature
  /** Last moment the driver may explain the deviation. */
  justificationDeadline: string
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export interface RouteDeviationSummary {
  toQualify: number
  unjustified: number
  /** Share of finished trips with no unjustified deviation, in percent. */
  complianceRate: number | null
}

export type RouteDeviationSearchColumn =
  | 'no'
  | 'tripNo'
  | 'vehiclePlate'
  | 'driverName'
  | 'no,tripNo,vehiclePlate,driverName'
