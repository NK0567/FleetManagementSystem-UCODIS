import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { InfractionOutcome } from '../domain/infraction'
import type { InfractionApi } from '../types/infraction.types'

const basePath = '/fleet/infractions'

export const infractionApi = {
  ...createCrudApi<InfractionApi>({ basePath }),
  take: (no: string) =>
    httpClient.post<SingleResponse<InfractionApi>>(`${resourcePath(basePath, no)}/take`),
  close: (no: string, outcome: InfractionOutcome, comment: string) =>
    httpClient.post<SingleResponse<InfractionApi>>(`${resourcePath(basePath, no)}/close`, {
      outcome,
      comment
    })
}
