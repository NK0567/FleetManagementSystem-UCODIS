import { createCrudService } from '@/core/factories'
import { maintenancePlanApi } from '../api/maintenancePlanApi'
import type {
  MaintenancePlanApi,
  MaintenancePlanSearchColumn
} from '../types/maintenancePlan.types'

export const maintenancePlanService = {
  ...createCrudService<MaintenancePlanApi, MaintenancePlanSearchColumn>(maintenancePlanApi),
  async duplicate(no: string, name: string): Promise<MaintenancePlanApi> {
    return (await maintenancePlanApi.duplicate(no, name)).data.data
  }
}
