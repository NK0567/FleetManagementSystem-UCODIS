import {
  FLEET_SETTING_FIELDS,
  isFleetSettingsSection,
  settingsSectionIssues,
  type FleetSettings,
  type SettingIssue
} from '@/modules/fleet/fleet-settings/domain/fleetSettings'
import type { FleetSettingsApi } from '@/modules/fleet/fleet-settings/types/fleetSettings.types'
import type { MockDatabase } from '../../db/database'
import { FLEET_SETTINGS_NO } from '../../fixtures/fleet/settings'
import { notFound, unprocessable } from '../../http/errors'
import { readBody, routeParam, stampModified } from '../../http/crudResource'
import { ok } from '../../http/responses'
import { readSettingField, settingFieldError } from '../../http/settings'
import type { MockRouter } from '../../http/router'
import { FLEET_MESSAGES } from './messages'

function issueError(issue: SettingIssue) {
  switch (issue.code) {
    case 'nightWindowIncomplete':
      return unprocessable(FLEET_MESSAGES.nightWindowIncomplete)
    case 'nightWindowEmpty':
      return unprocessable(FLEET_MESSAGES.nightWindowEmpty)
    default:
      return settingFieldError(issue)
  }
}

export function fleetSettings(db: MockDatabase): FleetSettings {
  return db.fleetSettings.findOrFail(FLEET_SETTINGS_NO)
}

/** The fleet has a single settings record; each section is saved on its own. */
export function registerFleetSettingsHandlers(router: MockRouter, db: MockDatabase): void {
  const toApi = (): FleetSettingsApi => {
    const {
      drivingTime,
      geofencing,
      documents,
      safety,
      fuel,
      telematics,
      driverScore,
      modifiedAt,
      modifiedBy
    } = db.fleetSettings.findOrFail(FLEET_SETTINGS_NO)
    return {
      drivingTime,
      geofencing,
      documents,
      safety,
      fuel,
      telematics,
      driverScore,
      modifiedAt,
      modifiedBy
    }
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
        FLEET_SETTING_FIELDS[section].map((field) => [field.key, readSettingField(body, field)])
      ) as unknown as FleetSettings[typeof section]
      const [issue] = settingsSectionIssues(section, values)
      if (issue) throw issueError(issue)
      db.fleetSettings.update(FLEET_SETTINGS_NO, { [section]: values, ...stampModified(request) })
      return ok(toApi())
    }
  )
}
