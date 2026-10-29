import type { ScoreFamilyRule } from '@/modules/fleet/drivers/domain/driverScore'
import { fleetSettingsApi } from '../api/fleetSettingsApi'
import type { FleetSettings, FleetSettingsSection } from '../domain/fleetSettings'
import type { ImportKind, ImportMapping } from '../domain/importMappings'
import type { IndicatorSetting } from '../domain/indicators'
import type { FleetSettingsApi } from '../types/fleetSettings.types'

export const fleetSettingsService = {
  async get(): Promise<FleetSettingsApi> {
    return (await fleetSettingsApi.get()).data.data
  },
  async updateSection<S extends FleetSettingsSection>(
    section: S,
    values: FleetSettings[S]
  ): Promise<FleetSettingsApi> {
    return (await fleetSettingsApi.updateSection(section, values)).data.data
  },
  async saveScoreFamilies(families: ScoreFamilyRule[]): Promise<ScoreFamilyRule[]> {
    return (await fleetSettingsApi.saveScoreFamilies(families)).data.data
  },
  async saveIndicators(indicators: IndicatorSetting[]): Promise<IndicatorSetting[]> {
    return (await fleetSettingsApi.saveIndicators(indicators)).data.data
  },
  async saveImportMapping(kind: ImportKind, mapping: ImportMapping): Promise<ImportMapping> {
    return (await fleetSettingsApi.saveImportMapping(kind, mapping)).data.data
  },
  async importMapping(kind: ImportKind): Promise<ImportMapping> {
    return (await fleetSettingsApi.importMapping(kind)).data.data
  }
}
