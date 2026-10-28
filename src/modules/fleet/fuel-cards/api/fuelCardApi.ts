import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { FuelCardApi } from '../types/fuelCard.types'

const basePath = '/fleet/fuel-cards'

export const fuelCardApi = {
  ...createCrudApi<FuelCardApi>({ basePath }),
  block: (no: string, reason: string) =>
    httpClient.post<SingleResponse<FuelCardApi>>(`${resourcePath(basePath, no)}/block`, { reason }),
  unblock: (no: string, comment: string) =>
    httpClient.post<SingleResponse<FuelCardApi>>(`${resourcePath(basePath, no)}/unblock`, {
      comment
    })
}
