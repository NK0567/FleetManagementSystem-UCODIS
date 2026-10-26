import { planningSettingsApi } from '../api/planningSettingsApi'
import type { PlanningSettings, PlanningSettingsSection } from '../domain/planningSettings'
import type { PlanningSettingsApi } from '../types/planningSettings.types'

export const planningSettingsService = {
  async get(): Promise<PlanningSettingsApi> {
    return (await planningSettingsApi.get()).data.data
  },
  async updateSection<S extends PlanningSettingsSection>(
    section: S,
    values: PlanningSettings[S]
  ): Promise<PlanningSettingsApi> {
    return (await planningSettingsApi.updateSection(section, values)).data.data
  }
}
