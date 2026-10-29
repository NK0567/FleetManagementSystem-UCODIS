import httpClient from '@/core/api/httpClient'
import type { SingleResponse } from '@/types/api-response.types'
import type { CompanySettingsApi, CompanySettingsInput } from '../types/companySettings.types'

const basePath = '/settings/company'

export const companySettingsApi = {
  async get(): Promise<CompanySettingsApi> {
    return (await httpClient.get<SingleResponse<CompanySettingsApi>>(basePath)).data.data
  },
  async update(input: CompanySettingsInput): Promise<CompanySettingsApi> {
    return (await httpClient.patch<SingleResponse<CompanySettingsApi>>(basePath, input)).data.data
  }
}
