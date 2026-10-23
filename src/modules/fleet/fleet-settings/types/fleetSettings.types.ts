import type { FleetSettings } from '../domain/fleetSettings'

export interface FleetSettingsApi extends FleetSettings {
  modifiedAt: string
  modifiedBy: string
}
