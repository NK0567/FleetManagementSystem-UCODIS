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
  date: string
}

export const serviceDueApi = {
  ...createCrudApi<ServiceDueApi>({ basePath }),
  recordPassage: (passage: PassageInput) =>
    httpClient.post<SingleResponse<ServiceDueApi>>(`${basePath}/passages`, passage),
  openWorkOrder: (vehicleNo: string) =>
    httpClient.post<SingleResponse<WorkOrderApi>>(`${basePath}/work-order`, { vehicleNo })
}
