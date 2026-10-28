import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { maintenancePlanService } from '../services/maintenancePlanService'
import type {
  MaintenancePlanApi,
  MaintenancePlanSearchColumn
} from '../types/maintenancePlan.types'

export const useMaintenancePlanStore = defineStore('maintenance-maintenance-plan', () => {
  const crud = useCrudState<MaintenancePlanApi, MaintenancePlanSearchColumn>({
    persistKey: 'maintenance-maintenance-plan',
    service: maintenancePlanService,
    defaultSearchColumn: 'no,name',
    entityLabelKey: 'maintenance.maintenancePlans.title',
    defaultSortBy: 'no'
  })

  return { ...crud }
})
