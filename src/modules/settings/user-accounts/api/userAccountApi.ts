import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { UserAccountApi } from '../types/userAccount.types'

const basePath = '/settings/user-accounts'

export const userAccountApi = {
  ...createCrudApi<UserAccountApi>({ basePath }),
  disable: (no: string, reason: string) =>
    httpClient.post<SingleResponse<UserAccountApi>>(`${resourcePath(basePath, no)}/disable`, {
      reason
    }),
  enable: (no: string) =>
    httpClient.post<SingleResponse<UserAccountApi>>(`${resourcePath(basePath, no)}/enable`, {})
}
