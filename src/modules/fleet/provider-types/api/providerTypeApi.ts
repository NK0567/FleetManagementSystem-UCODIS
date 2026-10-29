import { createCrudApi } from '@/core/factories'
import type { ProviderTypeApi } from '../types/providerType.types'

export const providerTypeApi = createCrudApi<ProviderTypeApi>({
  basePath: '/fleet/provider-types'
})
