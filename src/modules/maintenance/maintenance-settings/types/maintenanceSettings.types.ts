import type { MaintenanceSettings } from '../domain/maintenanceSettings'

export interface MaintenanceSettingsApi extends MaintenanceSettings {
  modifiedAt: string
  modifiedBy: string
}
