import { createCrudService } from '@/core/factories'
import type { WorkOrderApi } from '@/modules/maintenance/work-orders'
import { serviceDueApi, type PassageInput, type ServiceDueSummary } from '../api/serviceDueApi'
import type { ServiceDueApi, ServiceDueSearchColumn } from '../types/serviceDue.types'

export const serviceDueService = {
  ...createCrudService<ServiceDueApi, ServiceDueSearchColumn>(serviceDueApi),
  async summary(): Promise<ServiceDueSummary> {
    return (await serviceDueApi.summary()).data.data
  },
  async recordPassage(passage: PassageInput): Promise<ServiceDueApi> {
    return (await serviceDueApi.recordPassage(passage)).data.data
  },
  async recordEngineHours(vehicleNo: string, hours: number): Promise<void> {
    await serviceDueApi.recordEngineHours(vehicleNo, hours)
  },
  async openWorkOrder(vehicleNo: string): Promise<WorkOrderApi> {
    return (await serviceDueApi.openWorkOrder(vehicleNo)).data.data
  }
}
