import type { MaintenanceOperation } from '../domain/maintenancePlan'

export interface MaintenancePlanApi {
  no: string
  name: string
  provisional: boolean
  active: boolean
  source: string
  /** The models the plan applies to; see `modelCode`. */
  modelCodes: string[]
  modelNames: string
  /** The vehicles of those models, which inherit the plan. */
  vehicleNos: string[]
  operations: MaintenanceOperation[]
  vehiclePlates: string
  vehicleCount: number
  operationCount: number
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

/** Where the plans leave the park uncovered. */
export interface PlanCoverageApi {
  modelsWithoutPlan: { modelCode: string; modelName: string; vehicleCount: number }[]
  inactivePlansInUse: { no: string; name: string; vehicleCount: number }[]
}

export type MaintenancePlanSearchColumn = 'no' | 'name' | 'no,name'
