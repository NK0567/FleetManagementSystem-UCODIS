import {
  DEFAULT_FLEET_SETTINGS,
  type FleetSettings
} from '@/modules/fleet/fleet-settings/domain/fleetSettings'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export type FleetSettingsRow = MockRow & FleetSettings

export const FLEET_SETTINGS_NO = 'FLEET'

export const fleetSettingsCollection: CollectionDefinition<FleetSettingsRow> = {
  name: 'fleet-settings',
  seed: () => [{ no: FLEET_SETTINGS_NO, ...structuredClone(DEFAULT_FLEET_SETTINGS), ...seedAudit }]
}
