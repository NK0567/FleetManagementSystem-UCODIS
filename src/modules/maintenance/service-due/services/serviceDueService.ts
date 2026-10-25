import { createCrudService } from '@/core/factories'
import type { WorkOrderApi } from '@/modules/maintenance/work-orders'
import { serviceDueApi, type PassageInput } from '../api/serviceDueApi'
import type { ServiceDueApi, ServiceDueSearchColumn } from '../types/serviceDue.types'

export const serviceDueService = {
  ...createCrudService<ServiceDueApi, ServiceDueSearchColumn>(serviceDueApi),
  async recordPassage(passage: PassageInput): Promise<ServiceDueApi> {
    return (await serviceDueApi.recordPassage(passage)).data.data
  },
  async openWorkOrder(vehicleNo: string): Promise<WorkOrderApi> {
    return (await serviceDueApi.openWorkOrder(vehicleNo)).data.data
  }
}
