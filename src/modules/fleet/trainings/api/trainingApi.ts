import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { TrainingApi } from '../types/training.types'

const basePath = '/fleet/trainings'

export const trainingApi = {
  ...createCrudApi<TrainingApi>({ basePath }),
  attend: (no: string, attendedOn: string, result: string) =>
    httpClient.post<SingleResponse<TrainingApi>>(`${resourcePath(basePath, no)}/attend`, {
      attendedOn,
      result
    }),
  cancel: (no: string, reason: string) =>
    httpClient.post<SingleResponse<TrainingApi>>(`${resourcePath(basePath, no)}/cancel`, { reason })
}
