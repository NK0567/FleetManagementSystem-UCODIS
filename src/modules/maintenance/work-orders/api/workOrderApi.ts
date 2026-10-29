import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { ImportReport } from '@/core/utils/csvImport'
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
  | 'confirm-nomenclature'

export const workOrderApi = {
  ...createCrudApi<WorkOrderApi>({ basePath }),
  act: (no: string, action: WorkOrderAction, body: Record<string, unknown> = {}) =>
    httpClient.post<SingleResponse<WorkOrderApi>>(`${resourcePath(basePath, no)}/${action}`, body),
  importHistory: (rows: Record<string, unknown>[]) =>
    httpClient.post<SingleResponse<ImportReport>>(`${basePath}/import`, { rows }),
  openFromSource: (origin: string, originNo: string) =>
    httpClient.post<SingleResponse<WorkOrderApi>>(`${basePath}/from-source`, { origin, originNo })
}
