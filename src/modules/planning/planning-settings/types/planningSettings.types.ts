import type { PlanningSettings } from '../domain/planningSettings'

export interface PlanningSettingsApi extends PlanningSettings {
  modifiedAt: string
  modifiedBy: string
}
