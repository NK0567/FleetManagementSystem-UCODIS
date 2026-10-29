import { createCrudService } from '@/core/factories'
import { providerApi } from '../api/providerApi'
import type { ProviderApi, ProviderSearchColumn, ProviderSyncReport } from '../types/provider.types'

export const providerService = {
  ...createCrudService<ProviderApi, ProviderSearchColumn>(providerApi),
  /** Takes the third parties of the company management system (simulated in the mock-up). */
  async synchronize(): Promise<ProviderSyncReport> {
    return (await providerApi.synchronize()).data.data
  }
}
