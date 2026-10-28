import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { CouplingApi } from '../types/coupling.types'

const basePath = '/fleet/couplings'

export const couplingApi = {
  ...createCrudApi<CouplingApi>({ basePath }),
  end: (no: string, endDate: string) =>
    httpClient.post<SingleResponse<CouplingApi>>(`${resourcePath(basePath, no)}/end`, { endDate })
}
