import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { WorkOrderApi } from '../types/workOrder.types'

const basePath = '/maintenance/work-orders'

export type WorkOrderAction =
  | 'diagnose'
  | 'start'
  | 'labour'
  | 'complete'
  | 'validate'
  | 'refuse'
  | 'cancel'

export const workOrderApi = {
  ...createCrudApi<WorkOrderApi>({ basePath }),
  act: (no: string, action: WorkOrderAction, body: Record<string, unknown> = {}) =>
    httpClient.post<SingleResponse<WorkOrderApi>>(`${resourcePath(basePath, no)}/${action}`, body)
}
