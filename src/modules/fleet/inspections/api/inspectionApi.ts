import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { InspectionApi } from '../types/inspection.types'

const basePath = '/fleet/inspections'

export const inspectionApi = {
  ...createCrudApi<InspectionApi>({ basePath }),
  recheck: (no: string, recheckDoneOn: string) =>
    httpClient.post<SingleResponse<InspectionApi>>(`${resourcePath(basePath, no)}/recheck`, {
      recheckDoneOn
    })
}
