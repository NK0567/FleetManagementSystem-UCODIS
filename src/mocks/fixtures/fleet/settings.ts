import {
  DEFAULT_FLEET_SETTINGS,
  type FleetSettings
} from '@/modules/fleet/fleet-settings/domain/fleetSettings'
import { DEFAULT_SCORE_FAMILIES } from '@/modules/fleet/drivers/domain/driverScore'
import { DEFAULT_IMPORT_MAPPINGS } from '@/modules/fleet/fleet-settings/domain/importMappings'
import { DEFAULT_INDICATORS } from '@/modules/fleet/fleet-settings/domain/indicators'
import type { FleetSettingsLists } from '@/modules/fleet/fleet-settings/types/fleetSettings.types'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export type FleetSettingsRow = MockRow & FleetSettings & FleetSettingsLists

export const FLEET_SETTINGS_NO = 'FLEET'

export const DEFAULT_FLEET_SETTINGS_LISTS: FleetSettingsLists = {
  scoreFamilies: DEFAULT_SCORE_FAMILIES,
  importMappings: DEFAULT_IMPORT_MAPPINGS,
  indicators: DEFAULT_INDICATORS
}

export const fleetSettingsCollection: CollectionDefinition<FleetSettingsRow> = {
  name: 'fleet-settings',
  seed: () => [
    {
      no: FLEET_SETTINGS_NO,
      ...structuredClone(DEFAULT_FLEET_SETTINGS),
      ...structuredClone(DEFAULT_FLEET_SETTINGS_LISTS),
      ...seedAudit
    }
  ]
}
