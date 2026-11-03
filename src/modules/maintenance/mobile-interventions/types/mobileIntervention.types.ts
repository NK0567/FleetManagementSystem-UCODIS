import type { MobileInterventionStatus, MobileKpis } from '../domain/mobileIntervention'

/** Where the GPS unit of the vehicle last placed it when the mission was triggered. */
export interface VehiclePosition {
  latitude: number
  longitude: number
  reportedAt: string
  placeName: string
}

export interface MobileInterventionApi {
  no: string
  missionTypeNo: string
  vehicleNo: string
  location: string
  /** Null when the vehicle has no GPS unit in working order. */
  vehiclePosition: VehiclePosition | null
  departedAt: string
  /** Technicians sent, by employee number. */
  crewNos: string[]
  arrivedAt: string | null
  closedAt: string | null
  closedBy: string | null
  resolved: boolean | null
  observation: string
  checkCount: number | null
  positiveCount: number | null
  checkComment: string
  workOrderNo: string | null
  missionTypeName: string
  isControl: boolean
  vehiclePlate: string
  crewNames: string
  delayMin: number | null
  status: MobileInterventionStatus
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type MobileInterventionSearchColumn =
  | 'no'
  | 'vehiclePlate'
  | 'location'
  | 'no,vehiclePlate,location'

export interface MobileTeamSummary {
  month: string
  kpis: MobileKpis
  targets: {
    interventionsPerMonth: number
    resolutionRatePct: number
    averageTimeMin: number
    checksPerMonth: number
  }
}
