import type { AlertCategory, AlertSeverity } from '@/modules/fleet/alerts/domain/alert'
import type { LiveSituation } from '@/modules/fleet/live-map'
import type { VehicleStatus } from '@/modules/fleet/vehicles/types/vehicle.types'

export interface Availability {
  available: number
  total: number
}

export interface DashboardAlert {
  no: string
  category: AlertCategory
  severity: AlertSeverity
  subject: string
  detail: string
  since: string
  path: string
  recordNo: string
}

export interface DashboardImmobilization {
  vehicleNo: string
  plate: string
  status: VehicleStatus
  reason: string
}

/** A tracked vehicle as the control room board lists it. */
export interface SupervisedVehicle {
  vehicleNo: string
  plate: string
  driverName: string
  tripNo: string | null
  situation: LiveSituation
  placeName: string
  nextStopName: string
  speedKmh: number
  alertCount: number
  corridorGapM: number | null
}

export interface FleetSupervision {
  onMission: SupervisedVehicle[]
  stopped: SupervisedVehicle[]
  inAlert: SupervisedVehicle[]
  outOfZone: SupervisedVehicle[]
}

export interface FleetPark {
  total: number
  /** Ready to work: available or only assigned. */
  available: number
  onMission: number
  /** In maintenance, immobilized or out of service; their reasons are listed apart. */
  immobilized: number
  /** Share of the park that may work, in percent. */
  availabilityRate: number | null
  availabilityTargetPct: number
  averageAgeYears: number | null
}

export interface FleetDashboardApi {
  supervision: FleetSupervision
  park: FleetPark
  availability: { tractors: Availability; trailers: Availability; drivers: Availability }
  documents: { expired: number; expiring: number; missing: number }
  /** Same positions as the live map, counted by situation. */
  movement: Record<LiveSituation, number>
  latestAlerts: DashboardAlert[]
  immobilized: DashboardImmobilization[]
  fleetByStatus: { status: VehicleStatus; count: number }[]
  fuelThisMonth: { liters: number; amount: number; averageL100: number | null }
  compliance: {
    /** Share of finished trips with no unjustified deviation, in percent. */
    tripComplianceRate: number | null
    openInfractions: number
    driversBelowScore: number
  }
}
