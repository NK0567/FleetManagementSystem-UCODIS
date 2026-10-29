import { createCrudService } from '@/core/factories'
import type { ImportReport } from '@/core/utils/csvImport'
import { providerApi } from '../api/providerApi'
import type { ProviderApi, ProviderSearchColumn, ProviderSyncReport } from '../types/provider.types'

export const providerService = {
  ...createCrudService<ProviderApi, ProviderSearchColumn>(providerApi),
  async importRows(rows: Record<string, unknown>[]): Promise<ImportReport> {
    return (await providerApi.importRows(rows)).data.data
  },
  /** Takes the third parties of the company management system (simulated in the mock-up). */
  async synchronize(): Promise<ProviderSyncReport> {
    return (await providerApi.synchronize()).data.data
  }
}
