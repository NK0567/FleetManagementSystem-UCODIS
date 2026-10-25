import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { WorkOrderApi } from '../types/workOrder.types'

const basePath = '/maintenance/work-orders'

export type WorkOrderAction =
  | 'diagnose'
  | 'start'
  | 'labour'
  | 'take-part'
  | 'plan'
  | 'hand-over'
  | 'external-progress'
  | 'return'
  | 'complete'
  | 'validate'
  | 'refuse'
  | 'cancel'

export const workOrderApi = {
  ...createCrudApi<WorkOrderApi>({ basePath }),
  act: (no: string, action: WorkOrderAction, body: Record<string, unknown> = {}) =>
    httpClient.post<SingleResponse<WorkOrderApi>>(`${resourcePath(basePath, no)}/${action}`, body),
  openFromSource: (origin: string, originNo: string) =>
    httpClient.post<SingleResponse<WorkOrderApi>>(`${basePath}/from-source`, { origin, originNo })
}
