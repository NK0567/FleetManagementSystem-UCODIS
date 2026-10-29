import { planningSettingsApi } from '../api/planningSettingsApi'
import type {
  IncidentSettings,
  PlanningSettings,
  PlanningSettingsSection
} from '../domain/planningSettings'
import type { PlanningCircuitApi, PlanningSettingsApi } from '../types/planningSettings.types'

export const planningSettingsService = {
  async get(): Promise<PlanningSettingsApi> {
    return (await planningSettingsApi.get()).data.data
  },
  async circuit(): Promise<PlanningCircuitApi> {
    return (await planningSettingsApi.circuit()).data.data
  },
  async updateSection<S extends PlanningSettingsSection>(
    section: S,
    values: PlanningSettings[S]
  ): Promise<PlanningSettingsApi> {
    return (await planningSettingsApi.updateSection(section, values)).data.data
  },
  async updateIncidents(lists: IncidentSettings): Promise<PlanningSettingsApi> {
    return (await planningSettingsApi.updateIncidents(lists)).data.data
  }
}
