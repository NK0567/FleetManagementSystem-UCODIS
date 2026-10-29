import httpClient from '@/core/api/httpClient'
import { createCrudApi } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { DowntimeCodeApi } from '../types/downtimeCode.types'

const basePath = '/maintenance/downtime-codes'

export const downtimeCodeApi = {
  ...createCrudApi<DowntimeCodeApi>({ basePath }),
  /** Restores the proposed causes of downtime. */
  reset: () => httpClient.post<SingleResponse<DowntimeCodeApi[]>>(`${basePath}/reset`, {})
}
