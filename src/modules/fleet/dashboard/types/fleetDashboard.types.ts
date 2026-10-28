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

export interface FleetDashboardApi {
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
