import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { InsurancePolicyApi } from '../types/insurancePolicy.types'

const basePath = '/fleet/insurance-policies'

export const insurancePolicyApi = {
  ...createCrudApi<InsurancePolicyApi>({ basePath }),
  terminate: (no: string, terminatedOn: string, reason: string) =>
    httpClient.post<SingleResponse<InsurancePolicyApi>>(`${resourcePath(basePath, no)}/terminate`, {
      terminatedOn,
      reason
    })
}
