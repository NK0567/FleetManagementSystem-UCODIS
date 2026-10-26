import httpClient from '@/core/api/httpClient'
import type { SingleResponse } from '@/types/api-response.types'
import type { MaintenanceSettings, MaintenanceSettingsSection } from '../domain/maintenanceSettings'
import type { MaintenanceSettingsApi } from '../types/maintenanceSettings.types'

const basePath = '/maintenance/settings'

export const maintenanceSettingsApi = {
  get: () => httpClient.get<SingleResponse<MaintenanceSettingsApi>>(basePath),
  updateSection: <S extends MaintenanceSettingsSection>(
    section: S,
    values: MaintenanceSettings[S]
  ) => httpClient.put<SingleResponse<MaintenanceSettingsApi>>(`${basePath}/${section}`, values)
}
