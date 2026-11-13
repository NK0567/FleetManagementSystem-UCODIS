import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { TripDebriefApi } from '../types/tripDebrief.types'

const basePath = '/fleet/trip-debriefs'

export const tripDebriefApi = {
  ...createCrudApi<TripDebriefApi>({ basePath }),
  sign: (no: string, party: 'driver' | 'manager') =>
    httpClient.post<SingleResponse<TripDebriefApi>>(`${resourcePath(basePath, no)}/sign`, {
      party
    }),
  close: (no: string) =>
    httpClient.post<SingleResponse<TripDebriefApi>>(`${resourcePath(basePath, no)}/close`, {})
}
