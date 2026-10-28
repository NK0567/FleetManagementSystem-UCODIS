import {
  DEFAULT_MAINTENANCE_SETTINGS,
  type MaintenanceSettings
} from '@/modules/maintenance/maintenance-settings/domain/maintenanceSettings'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export type MaintenanceSettingsRow = MockRow & MaintenanceSettings

export const MAINTENANCE_SETTINGS_NO = 'MAINTENANCE'

export const maintenanceSettingsCollection: CollectionDefinition<MaintenanceSettingsRow> = {
  name: 'maintenance-settings',
  seed: () => [
    { no: MAINTENANCE_SETTINGS_NO, ...structuredClone(DEFAULT_MAINTENANCE_SETTINGS), ...seedAudit }
  ]
}
