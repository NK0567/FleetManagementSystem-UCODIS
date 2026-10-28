import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { DriverActivityApi, DriverApi, DriverScoreApi } from '../types/driver.types'

const basePath = '/fleet/drivers'

export const driverApi = {
  ...createCrudApi<DriverApi>({ basePath }),
  activity: (no: string) =>
    httpClient.get<SingleResponse<DriverActivityApi>>(`${resourcePath(basePath, no)}/activity`),
  score: (no: string) =>
    httpClient.get<SingleResponse<DriverScoreApi>>(`${resourcePath(basePath, no)}/score`),
  proposeTraining: (no: string) =>
    httpClient.post<SingleResponse<DriverScoreApi>>(`${resourcePath(basePath, no)}/score-training`)
}
