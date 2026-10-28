import { createCrudApi } from '@/core/factories'
import type { ProviderApi } from '../types/provider.types'

export const providerApi = createCrudApi<ProviderApi>({
  basePath: '/fleet/providers'
})
