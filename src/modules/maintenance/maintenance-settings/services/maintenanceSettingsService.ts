import { maintenanceSettingsApi } from '../api/maintenanceSettingsApi'
import type { MaintenanceSettings, MaintenanceSettingsSection } from '../domain/maintenanceSettings'
import type { MaintenanceSettingsApi } from '../types/maintenanceSettings.types'

export const maintenanceSettingsService = {
  async get(): Promise<MaintenanceSettingsApi> {
    return (await maintenanceSettingsApi.get()).data.data
  },
  async updateSection<S extends MaintenanceSettingsSection>(
    section: S,
    values: MaintenanceSettings[S]
  ): Promise<MaintenanceSettingsApi> {
    return (await maintenanceSettingsApi.updateSection(section, values)).data.data
  }
}
