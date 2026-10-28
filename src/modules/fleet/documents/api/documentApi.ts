import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { DeclaredStatus } from '../domain/document'
import type { DocumentApi, MissingDocumentApi } from '../types/document.types'

const basePath = '/fleet/documents'

export const documentApi = {
  ...createCrudApi<DocumentApi>({ basePath }),
  declare: (no: string, status: DeclaredStatus, reason: string) =>
    httpClient.post<SingleResponse<DocumentApi>>(`${resourcePath(basePath, no)}/declare`, {
      status,
      reason
    })
}

export const missingDocumentApi = createCrudApi<MissingDocumentApi>({
  basePath: '/fleet/missing-documents'
})
