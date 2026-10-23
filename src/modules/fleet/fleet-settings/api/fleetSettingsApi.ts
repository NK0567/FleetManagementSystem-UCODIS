import httpClient from '@/core/api/httpClient'
import type { SingleResponse } from '@/types/api-response.types'
import type { FleetSettings, FleetSettingsSection } from '../domain/fleetSettings'
import type { FleetSettingsApi } from '../types/fleetSettings.types'

const basePath = '/fleet/settings'

export const fleetSettingsApi = {
  get: () => httpClient.get<SingleResponse<FleetSettingsApi>>(basePath),
  updateSection: <S extends FleetSettingsSection>(section: S, values: FleetSettings[S]) =>
    httpClient.put<SingleResponse<FleetSettingsApi>>(`${basePath}/${section}`, values)
}
