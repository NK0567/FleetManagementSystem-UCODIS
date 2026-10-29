import httpClient from '@/core/api/httpClient'
import { createCrudApi } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { WorkOrderApi } from '@/modules/maintenance/work-orders'
import type { ServiceDueApi } from '../types/serviceDue.types'

const basePath = '/maintenance/service-due'

export interface PassageInput {
  vehicleNo: string
  operationNo: string
  km: number | null
  hours: number | null
  date: string
}

/** How many due items are past their point, and how many come close to it. */
export interface ServiceDueSummary {
  overdue: number
  blocking: number
  dueSoon: number
}

export const serviceDueApi = {
  ...createCrudApi<ServiceDueApi>({ basePath }),
  summary: () => httpClient.get<SingleResponse<ServiceDueSummary>>(`${basePath}/summary`),
  recordPassage: (passage: PassageInput) =>
    httpClient.post<SingleResponse<ServiceDueApi>>(`${basePath}/passages`, passage),
  recordEngineHours: (vehicleNo: string, hours: number) =>
    httpClient.post<SingleResponse<unknown>>('/maintenance/engine-hours', { vehicleNo, hours }),
  openWorkOrder: (vehicleNo: string) =>
    httpClient.post<SingleResponse<WorkOrderApi>>(`${basePath}/work-order`, { vehicleNo })
}
