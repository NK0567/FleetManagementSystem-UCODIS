import {
  isMaintenanceSettingsSection,
  MAINTENANCE_SETTING_FIELDS,
  MAINTENANCE_SETTINGS_SECTIONS,
  maintenanceSettingsIssues,
  type MaintenanceSettings
} from '@/modules/maintenance/maintenance-settings/domain/maintenanceSettings'
import type { MaintenanceSettingsApi } from '@/modules/maintenance/maintenance-settings/types/maintenanceSettings.types'
import type { MockDatabase } from '../../db/database'
import { MAINTENANCE_SETTINGS_NO } from '../../fixtures/maintenance/settings'
import { readBody, routeParam, stampModified } from '../../http/crudResource'
import { notFound } from '../../http/errors'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { readSettingField, settingFieldError } from '../../http/settings'
import { MAINTENANCE_MESSAGES } from './messages'

export function maintenanceSettings(db: MockDatabase): MaintenanceSettings {
  return db.maintenanceSettings.findOrFail(MAINTENANCE_SETTINGS_NO)
}

/** One settings record for the workshop, saved one section at a time. */
export function registerMaintenanceSettingsHandlers(router: MockRouter, db: MockDatabase): void {
  const toApi = (): MaintenanceSettingsApi => {
    const row = db.maintenanceSettings.findOrFail(MAINTENANCE_SETTINGS_NO)
    const sections = Object.fromEntries(
      MAINTENANCE_SETTINGS_SECTIONS.map((section) => [section, row[section]])
    ) as unknown as MaintenanceSettings
    return { ...sections, modifiedAt: row.modifiedAt, modifiedBy: row.modifiedBy }
  }

  router.get('/maintenance/settings', { feature: 'MAINTENANCESETTINGS', action: 'read' }, () =>
    ok(toApi())
  )

  router.put(
    '/maintenance/settings/:section',
    { feature: 'MAINTENANCESETTINGS', action: 'update' },
    (request) => {
      const section = routeParam(request, 'section')
      if (!isMaintenanceSettingsSection(section)) {
        throw notFound(MAINTENANCE_MESSAGES.unknownSettingsSection)
      }
      const body = readBody(request)
      const values = Object.fromEntries(
        MAINTENANCE_SETTING_FIELDS[section].map((field) => [
          field.key,
          readSettingField(body, field)
        ])
      )
      const [issue] = maintenanceSettingsIssues(section, values)
      if (issue) throw settingFieldError(issue)
      db.maintenanceSettings.update(MAINTENANCE_SETTINGS_NO, {
        [section]: values,
        ...stampModified(request)
      })
      return ok(toApi())
    }
  )
}
