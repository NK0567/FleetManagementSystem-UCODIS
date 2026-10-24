import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { DriverApi, DriverScoreApi } from '../types/driver.types'

const basePath = '/fleet/drivers'

export const driverApi = {
  ...createCrudApi<DriverApi>({ basePath }),
  score: (no: string) =>
    httpClient.get<SingleResponse<DriverScoreApi>>(`${resourcePath(basePath, no)}/score`),
  proposeTraining: (no: string) =>
    httpClient.post<SingleResponse<DriverScoreApi>>(`${resourcePath(basePath, no)}/score-training`)
}
