import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { MobileInterventionApi, MobileTeamSummary } from '../types/mobileIntervention.types'

const basePath = '/maintenance/mobile-interventions'

export type MobileInterventionAction = 'arrive' | 'checks' | 'close'

export const mobileInterventionApi = {
  ...createCrudApi<MobileInterventionApi>({ basePath }),
  summary: (month: string) =>
    httpClient.get<SingleResponse<MobileTeamSummary>>(`${basePath}/summary`, { params: { month } }),
  act: (no: string, action: MobileInterventionAction, body: Record<string, unknown> = {}) =>
    httpClient.post<SingleResponse<MobileInterventionApi>>(
      `${resourcePath(basePath, no)}/${action}`,
      body
    )
}
