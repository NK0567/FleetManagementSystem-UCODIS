import httpClient from '@/core/api/httpClient'
import type { SingleResponse } from '@/types/api-response.types'
import type { PlanningSettings, PlanningSettingsSection } from '../domain/planningSettings'
import type { PlanningSettingsApi } from '../types/planningSettings.types'

const basePath = '/planning/settings'

export const planningSettingsApi = {
  get: () => httpClient.get<SingleResponse<PlanningSettingsApi>>(basePath),
  updateSection: <S extends PlanningSettingsSection>(section: S, values: PlanningSettings[S]) =>
    httpClient.put<SingleResponse<PlanningSettingsApi>>(`${basePath}/${section}`, values)
}
