import { createCrudService } from '@/core/factories'
import { maintenancePlanApi } from '../api/maintenancePlanApi'
import type {
  MaintenancePlanApi,
  MaintenancePlanSearchColumn,
  PlanCoverageApi
} from '../types/maintenancePlan.types'

export const maintenancePlanService = {
  ...createCrudService<MaintenancePlanApi, MaintenancePlanSearchColumn>(maintenancePlanApi),
  async coverage(): Promise<PlanCoverageApi> {
    return (await maintenancePlanApi.coverage()).data.data
  },
  async createForModel(modelCode: string): Promise<MaintenancePlanApi> {
    return (await maintenancePlanApi.createForModel(modelCode)).data.data
  },
  async duplicate(no: string, name: string): Promise<MaintenancePlanApi> {
    return (await maintenancePlanApi.duplicate(no, name)).data.data
  }
}
