import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { FuelRefillApi } from '../types/fuelRefill.types'

const basePath = '/fleet/fuel-refills'

export const fuelRefillApi = {
  ...createCrudApi<FuelRefillApi>({ basePath }),
  qualify: (no: string, causeNo: string, comment: string) =>
    httpClient.post<SingleResponse<FuelRefillApi>>(`${resourcePath(basePath, no)}/qualify`, {
      causeNo,
      comment
    })
}
