import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { OrgUnitApi } from '../types/orgUnit.types'

const basePath = '/hr/org-units'

export const orgUnitApi = {
  ...createCrudApi<OrgUnitApi>({ basePath }),
  validate(no: string) {
    return httpClient.post<SingleResponse<OrgUnitApi>>(`${resourcePath(basePath, no)}/validate`)
  }
}
