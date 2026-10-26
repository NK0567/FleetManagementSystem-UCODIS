import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { TrainingApi } from '@/modules/fleet/trainings'
import type { SingleResponse } from '@/types/api-response.types'
import type { InsuranceStatus } from '../domain/claim'
import type { ClaimApi } from '../types/claim.types'

const basePath = '/fleet/claims'

export interface InsuranceStep {
  status: InsuranceStatus
  indemnityAmount: number | null
  comment: string
}

export const claimApi = {
  ...createCrudApi<ClaimApi>({ basePath }),
  insurance: (no: string, step: InsuranceStep) =>
    httpClient.post<SingleResponse<ClaimApi>>(`${resourcePath(basePath, no)}/insurance`, step),
  training: (no: string, topic: string) =>
    httpClient.post<SingleResponse<TrainingApi>>(`${resourcePath(basePath, no)}/training`, {
      topic
    }),
  close: (no: string) =>
    httpClient.post<SingleResponse<ClaimApi>>(`${resourcePath(basePath, no)}/close`)
}
