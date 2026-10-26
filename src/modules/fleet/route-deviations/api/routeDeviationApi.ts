import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { DeviationDecision, QualifiedNature } from '../domain/routeDeviation'
import type { RouteDeviationApi, RouteDeviationSummary } from '../types/routeDeviation.types'

const basePath = '/fleet/route-deviations'

export interface DeviationQualificationInput {
  nature: QualifiedNature
  decision: DeviationDecision
  reason: string
}

export const routeDeviationApi = {
  ...createCrudApi<RouteDeviationApi>({ basePath }),
  summary: () => httpClient.get<SingleResponse<RouteDeviationSummary>>(`${basePath}/summary`),
  justify: (no: string, justification: string) =>
    httpClient.post<SingleResponse<RouteDeviationApi>>(`${resourcePath(basePath, no)}/justify`, {
      justification
    }),
  qualify: (no: string, qualification: DeviationQualificationInput) =>
    httpClient.post<SingleResponse<RouteDeviationApi>>(
      `${resourcePath(basePath, no)}/qualify`,
      qualification
    )
}
