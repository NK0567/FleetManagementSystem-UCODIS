import httpClient from '@/core/api/httpClient'
import { createCrudApi } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { ProviderApi, ProviderSyncReport } from '../types/provider.types'

const basePath = '/fleet/providers'

export const providerApi = {
  ...createCrudApi<ProviderApi>({ basePath }),
  synchronize: () => httpClient.post<SingleResponse<ProviderSyncReport>>(`${basePath}/sync`, {})
}
