import {
  DEFAULT_PLANNING_SETTINGS,
  type PlanningSettings
} from '@/modules/planning/planning-settings/domain/planningSettings'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export type PlanningSettingsRow = MockRow & PlanningSettings

export const PLANNING_SETTINGS_NO = 'PLANNING'

export const planningSettingsCollection: CollectionDefinition<PlanningSettingsRow> = {
  name: 'planning-settings',
  seed: () => [
    { no: PLANNING_SETTINGS_NO, ...structuredClone(DEFAULT_PLANNING_SETTINGS), ...seedAudit }
  ]
}
