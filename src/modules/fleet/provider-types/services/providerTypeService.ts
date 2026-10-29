import { createCrudService } from '@/core/factories'
import { providerTypeApi } from '../api/providerTypeApi'
import type { ProviderTypeApi, ProviderTypeSearchColumn } from '../types/providerType.types'

export const providerTypeService = createCrudService<ProviderTypeApi, ProviderTypeSearchColumn>(
  providerTypeApi
)
