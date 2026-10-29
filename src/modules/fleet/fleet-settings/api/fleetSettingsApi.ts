import httpClient from '@/core/api/httpClient'
import type { SingleResponse } from '@/types/api-response.types'
import type { ScoreFamilyRule } from '@/modules/fleet/drivers/domain/driverScore'
import type { FleetSettings, FleetSettingsSection } from '../domain/fleetSettings'
import type { ImportKind, ImportMapping } from '../domain/importMappings'
import type { IndicatorSetting } from '../domain/indicators'
import type { FleetSettingsApi } from '../types/fleetSettings.types'

const basePath = '/fleet/settings'

export const fleetSettingsApi = {
  get: () => httpClient.get<SingleResponse<FleetSettingsApi>>(basePath),
  updateSection: <S extends FleetSettingsSection>(section: S, values: FleetSettings[S]) =>
    httpClient.put<SingleResponse<FleetSettingsApi>>(`${basePath}/${section}`, values),
  saveScoreFamilies: (families: ScoreFamilyRule[]) =>
    httpClient.put<SingleResponse<ScoreFamilyRule[]>>(`${basePath}/score-families`, { families }),
  saveIndicators: (indicators: IndicatorSetting[]) =>
    httpClient.put<SingleResponse<IndicatorSetting[]>>(`${basePath}/indicators`, { indicators }),
  saveImportMapping: (kind: ImportKind, mapping: ImportMapping) =>
    httpClient.put<SingleResponse<ImportMapping>>(`${basePath}/import-mappings/${kind}`, {
      mapping
    }),
  importMapping: (kind: ImportKind) =>
    httpClient.get<SingleResponse<ImportMapping>>(`/fleet/import-mappings/${kind}`)
}
