import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { TelematicsEventApi } from '../types/telematicsEvent.types'

const basePath = '/fleet/telematics-events'

export const telematicsEventApi = {
  ...createCrudApi<TelematicsEventApi>({ basePath }),
  acknowledge: (no: string, comment: string) =>
    httpClient.post<SingleResponse<TelematicsEventApi>>(
      `${resourcePath(basePath, no)}/acknowledge`,
      { comment }
    ),
  openInfraction: (no: string) =>
    httpClient.post<SingleResponse<TelematicsEventApi>>(`${resourcePath(basePath, no)}/infraction`)
}
