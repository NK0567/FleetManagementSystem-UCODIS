import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { MaintenancePlanApi, PlanCoverageApi } from '../types/maintenancePlan.types'

const basePath = '/maintenance/maintenance-plans'

export const maintenancePlanApi = {
  ...createCrudApi<MaintenancePlanApi>({ basePath }),
  coverage: () => httpClient.get<SingleResponse<PlanCoverageApi>>(`${basePath}/coverage`),
  createForModel: (modelCode: string) =>
    httpClient.post<SingleResponse<MaintenancePlanApi>>(`${basePath}/for-model`, { modelCode }),
  duplicate: (no: string, name: string) =>
    httpClient.post<SingleResponse<MaintenancePlanApi>>(`${resourcePath(basePath, no)}/duplicate`, {
      name
    })
}
