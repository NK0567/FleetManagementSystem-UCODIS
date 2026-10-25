import type { MaintenanceOperation } from '../domain/maintenancePlan'

export interface MaintenancePlanApi {
  no: string
  name: string
  provisional: boolean
  active: boolean
  source: string
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

export type MaintenancePlanSearchColumn = 'no' | 'name' | 'no,name'
