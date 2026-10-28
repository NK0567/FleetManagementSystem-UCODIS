import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { DowntimeApi } from '../types/downtime.types'

const basePath = '/maintenance/downtimes'

export const downtimeApi = {
  ...createCrudApi<DowntimeApi>({ basePath }),
  end: (no: string, comment: string) =>
    httpClient.post<SingleResponse<DowntimeApi>>(`${resourcePath(basePath, no)}/end`, { comment })
}
