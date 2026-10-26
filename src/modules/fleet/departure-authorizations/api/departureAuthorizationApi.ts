import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { DepartureAuthorizationApi } from '../types/departureAuthorization.types'

const basePath = '/fleet/departure-authorizations'

export const departureAuthorizationApi = {
  ...createCrudApi<DepartureAuthorizationApi>({ basePath }),
  grant: (no: string) =>
    httpClient.post<SingleResponse<DepartureAuthorizationApi>>(
      `${resourcePath(basePath, no)}/grant`
    ),
  refuse: (no: string, reason: string) =>
    httpClient.post<SingleResponse<DepartureAuthorizationApi>>(
      `${resourcePath(basePath, no)}/refuse`,
      { reason }
    )
}
