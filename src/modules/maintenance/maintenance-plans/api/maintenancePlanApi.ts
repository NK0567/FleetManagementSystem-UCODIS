import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { MaintenancePlanApi } from '../types/maintenancePlan.types'

const basePath = '/maintenance/maintenance-plans'

export const maintenancePlanApi = {
  ...createCrudApi<MaintenancePlanApi>({ basePath }),
  duplicate: (no: string, name: string) =>
    httpClient.post<SingleResponse<MaintenancePlanApi>>(`${resourcePath(basePath, no)}/duplicate`, {
      name
    })
}
