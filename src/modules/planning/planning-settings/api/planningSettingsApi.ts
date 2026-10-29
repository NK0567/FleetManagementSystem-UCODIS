import httpClient from '@/core/api/httpClient'
import type { SingleResponse } from '@/types/api-response.types'
import type {
  IncidentSettings,
  PlanningSettings,
  PlanningSettingsSection
} from '../domain/planningSettings'
import type { PlanningCircuitApi, PlanningSettingsApi } from '../types/planningSettings.types'

const basePath = '/planning/settings'

export const planningSettingsApi = {
  get: () => httpClient.get<SingleResponse<PlanningSettingsApi>>(basePath),
  circuit: () => httpClient.get<SingleResponse<PlanningCircuitApi>>(`${basePath}/circuit`),
  updateSection: <S extends PlanningSettingsSection>(section: S, values: PlanningSettings[S]) =>
    httpClient.put<SingleResponse<PlanningSettingsApi>>(`${basePath}/${section}`, values),
  updateIncidents: (lists: IncidentSettings) =>
    httpClient.put<SingleResponse<PlanningSettingsApi>>(`${basePath}/incidents`, lists)
}
