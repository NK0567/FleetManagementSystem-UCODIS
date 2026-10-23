import {
  FLEET_SETTING_FIELDS,
  isFleetSettingsSection,
  settingsSectionIssues,
  type FleetSettings,
  type SettingField,
  type SettingIssue
} from '@/modules/fleet/fleet-settings/domain/fleetSettings'
import type { FleetSettingsApi } from '@/modules/fleet/fleet-settings/types/fleetSettings.types'
import type { MockDatabase } from '../../db/database'
import { FLEET_SETTINGS_NO } from '../../fixtures/fleet/settings'
import { notFound, unprocessable } from '../../http/errors'
import { readBody, routeParam, stampModified } from '../../http/crudResource'
import { invalidField } from '../../http/input'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { FLEET_MESSAGES } from './messages'

function readField(input: Record<string, unknown>, field: SettingField): string | number | null {
  const raw = input[field.key]
  if (field.kind === 'time') {
    if (raw != null && typeof raw !== 'string') throw invalidField(field.key)
    return (raw ?? '').trim()
  }
  if (raw == null || raw === '') return null
  const value = Number(raw)
  if (!Number.isFinite(value)) throw invalidField(field.key)
  return value
}

function issueError(issue: SettingIssue) {
  switch (issue.code) {
    case 'required':
      return unprocessable(FLEET_MESSAGES.settingRequired, { field: issue.field })
    case 'outOfRange':
      return unprocessable(FLEET_MESSAGES.settingOutOfRange, {
        field: issue.field,
        min: issue.min,
        max: issue.max
      })
    case 'invalidTime':
      return unprocessable(FLEET_MESSAGES.settingInvalidTime, { field: issue.field })
    case 'nightWindowIncomplete':
      return unprocessable(FLEET_MESSAGES.nightWindowIncomplete)
    case 'nightWindowEmpty':
      return unprocessable(FLEET_MESSAGES.nightWindowEmpty)
  }
}

export function fleetSettings(db: MockDatabase): FleetSettings {
  return db.fleetSettings.findOrFail(FLEET_SETTINGS_NO)
}

/** The fleet has a single settings record; each section is saved on its own. */
export function registerFleetSettingsHandlers(router: MockRouter, db: MockDatabase): void {
  const toApi = (): FleetSettingsApi => {
    const { drivingTime, geofencing, documents, modifiedAt, modifiedBy } =
      db.fleetSettings.findOrFail(FLEET_SETTINGS_NO)
    return { drivingTime, geofencing, documents, modifiedAt, modifiedBy }
  }

  router.get('/fleet/settings', { feature: 'FLEETSETTINGS', action: 'read' }, () => ok(toApi()))

  router.put(
    '/fleet/settings/:section',
    { feature: 'FLEETSETTINGS', action: 'update' },
    (request) => {
      const section = routeParam(request, 'section')
      if (!isFleetSettingsSection(section)) throw notFound(FLEET_MESSAGES.unknownSettingsSection)
      const body = readBody(request)
      const values = Object.fromEntries(
        FLEET_SETTING_FIELDS[section].map((field) => [field.key, readField(body, field)])
      ) as unknown as FleetSettings[typeof section]
      const [issue] = settingsSectionIssues(section, values)
      if (issue) throw issueError(issue)
      db.fleetSettings.update(FLEET_SETTINGS_NO, { [section]: values, ...stampModified(request) })
      return ok(toApi())
    }
  )
}
