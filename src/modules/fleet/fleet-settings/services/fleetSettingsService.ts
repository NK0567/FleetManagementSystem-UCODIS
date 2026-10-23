import { fleetSettingsApi } from '../api/fleetSettingsApi'
import type { FleetSettings, FleetSettingsSection } from '../domain/fleetSettings'
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
  }
}
