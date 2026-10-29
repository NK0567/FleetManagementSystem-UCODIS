import type { ScoreFamilyRule } from '@/modules/fleet/drivers/domain/driverScore'
import type { FleetSettings } from '../domain/fleetSettings'
import type { ImportMappings } from '../domain/importMappings'
import type { IndicatorSetting } from '../domain/indicators'

/** What the settings record holds besides its sections of plain values. */
export interface FleetSettingsLists {
  scoreFamilies: ScoreFamilyRule[]
  importMappings: ImportMappings
  indicators: IndicatorSetting[]
}

export interface FleetSettingsApi extends FleetSettings, FleetSettingsLists {
  modifiedAt: string
  modifiedBy: string
}
