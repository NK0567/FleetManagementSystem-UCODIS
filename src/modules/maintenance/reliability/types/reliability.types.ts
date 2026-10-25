import type { ReliabilityKpis } from '../domain/reliability'

export interface NamedCount {
  name: string
  count: number
}

export interface ReliabilityApi {
  from: string
  to: string
  kpis: ReliabilityKpis
  bySubsystem: NamedCount[]
  byMode: NamedCount[]
  byCause: NamedCount[]
  lostDaysByFamily: { family: string; days: number; cost: number }[]
  topVehicles: { plate: string; failures: number; cost: number }[]
}

export interface MaintenanceDashboardApi {
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
