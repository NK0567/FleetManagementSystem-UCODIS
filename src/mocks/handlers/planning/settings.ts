import {
  isPlanningSettingsSection,
  PLANNING_SETTING_FIELDS,
  PLANNING_SETTINGS_SECTIONS,
  planningSettingsIssues,
  DEFAULT_PLANNING_SETTINGS,
  type PlanningSettings
} from '@/modules/planning/planning-settings/domain/planningSettings'
import type { PlanningSettingsApi } from '@/modules/planning/planning-settings/types/planningSettings.types'
import type { MockDatabase } from '../../db/database'
import { PLANNING_SETTINGS_NO } from '../../fixtures/planning/settings'
import { readBody, routeParam, stampModified } from '../../http/crudResource'
import { notFound } from '../../http/errors'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { readSettingField, settingFieldError } from '../../http/settings'
import { PLANNING_MESSAGES } from './messages'

export function planningSettings(db: MockDatabase): PlanningSettings {
  const row = db.planningSettings.findOrFail(PLANNING_SETTINGS_NO)
  // A record saved before a section existed reads that section's defaults.
  return { ...structuredClone(DEFAULT_PLANNING_SETTINGS), ...row }
}

/** One settings record for transport planning, saved one section at a time. */
export function registerPlanningSettingsHandlers(router: MockRouter, db: MockDatabase): void {
  const toApi = (): PlanningSettingsApi => {
    const row = planningSettings(db)
    const sections = Object.fromEntries(
      PLANNING_SETTINGS_SECTIONS.map((section) => [section, row[section]])
    ) as unknown as PlanningSettings
    const stored = db.planningSettings.findOrFail(PLANNING_SETTINGS_NO)
    return { ...sections, modifiedAt: stored.modifiedAt, modifiedBy: stored.modifiedBy }
  }

  router.get('/planning/settings', { feature: 'PLANNINGSETTINGS', action: 'read' }, () =>
    ok(toApi())
  )

  router.put(
    '/planning/settings/:section',
    { feature: 'PLANNINGSETTINGS', action: 'update' },
    (request) => {
      const section = routeParam(request, 'section')
      if (!isPlanningSettingsSection(section)) {
        throw notFound(PLANNING_MESSAGES.unknownSettingsSection)
      }
      const body = readBody(request)
      const values = Object.fromEntries(
        PLANNING_SETTING_FIELDS[section].map((field) => [field.key, readSettingField(body, field)])
      )
      const [issue] = planningSettingsIssues(section, values)
      if (issue) throw settingFieldError(issue)
      db.planningSettings.update(PLANNING_SETTINGS_NO, {
        [section]: values,
        ...stampModified(request)
      })
      return ok(toApi())
    }
  )
}
