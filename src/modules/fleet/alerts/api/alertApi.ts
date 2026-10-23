import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { AlertApi } from '../types/alert.types'

const basePath = '/fleet/alerts'

export const alertApi = {
  ...createCrudApi<AlertApi>({ basePath }),
  acknowledge: (no: string) =>
    httpClient.post<SingleResponse<AlertApi>>(`${resourcePath(basePath, no)}/acknowledge`),
  handle: (no: string, comment: string) =>
    httpClient.post<SingleResponse<AlertApi>>(`${resourcePath(basePath, no)}/handle`, { comment })
}
