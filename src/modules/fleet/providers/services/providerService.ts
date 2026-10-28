import { createCrudService } from '@/core/factories'
import { providerApi } from '../api/providerApi'
import type { ProviderApi, ProviderSearchColumn } from '../types/provider.types'

export const providerService = createCrudService<ProviderApi, ProviderSearchColumn>(providerApi)
