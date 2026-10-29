import type { MaintenanceTargetSettings } from '@/modules/maintenance/maintenance-settings/domain/maintenanceSettings'
import type { OwnershipCost, ReliabilityKpis } from '../domain/reliability'

export interface NamedCount {
  name: string
  count: number
}

/** What the maintenance manager steers with, beside the reliability indicators. */
export interface MaintenanceSteering {
  /** Work orders today: started, planned for a coming day, planned for a day gone by. */
  workload: { inProgress: number; planned: number; late: number }
  /** Preventive orders of the period done, against those due plus the services left overdue. */
  preventiveCompletion: {
    due: number
    done: number
    missedServices: number
    rate: number | null
  }
  /** Cost of the orders validated in the period, by kind of maintenance. */
  costByType: { preventive: number; corrective: number; improvement: number }
  /** Days lost to a human cause against days lost to a technical one. */
  lostDaysByCause: { human: number; technical: number; ratio: number | null }
  targets: MaintenanceTargetSettings
}

export interface ReliabilityApi extends MaintenanceSteering {
  from: string
  to: string
  kpis: ReliabilityKpis
  bySubsystem: NamedCount[]
  byMode: NamedCount[]
  byCause: NamedCount[]
  lostDaysByFamily: { family: string; days: number; cost: number }[]
  topVehicles: { plate: string; failures: number; cost: number }[]
  /** Fleet km of the period over the failures of each subsystem. */
  mtbfBySubsystem: { name: string; failures: number; mtbfKm: number | null }[]
  /** Breakdowns handled on the road by the mobile team against those brought to the workshop. */
  breakdownPlace: { road: number; workshop: number; roadShare: number | null }
  /** Days a vehicle was lost in the period for every 10 000 km it ran in it. */
  lostDaysPer10000Km: { plate: string; km: number; lostDays: number; ratio: number | null }[]
}

export interface MaintenanceDashboardApi extends Pick<
  MaintenanceSteering,
  'workload' | 'preventiveCompletion' | 'targets'
> {
  openOrders: number
  awaitingValidation: number
  awaitingParts: number
  atOutsideGarage: number
  unavailableVehicles: number
  servicesToPlan: number
  blockingServices: number
  lowStockItems: number
  pendingPurchases: number
  tyreAlerts: number
  last30Days: ReliabilityKpis
}

export interface VehicleCostApi extends OwnershipCost {
  vehicleNo: string
  from: string
  to: string
  km: number
  acquisitionCost: number | null
}
