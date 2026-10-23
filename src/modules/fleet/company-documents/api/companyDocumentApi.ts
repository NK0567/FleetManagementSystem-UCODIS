import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { CompanyDocumentApi } from '../types/companyDocument.types'

const basePath = '/fleet/company-documents'

export const companyDocumentApi = {
  ...createCrudApi<CompanyDocumentApi>({ basePath }),
  approve: (no: string) =>
    httpClient.post<SingleResponse<CompanyDocumentApi>>(`${resourcePath(basePath, no)}/approve`),
  reject: (no: string, reason: string) =>
    httpClient.post<SingleResponse<CompanyDocumentApi>>(`${resourcePath(basePath, no)}/reject`, {
      reason
    })
}
