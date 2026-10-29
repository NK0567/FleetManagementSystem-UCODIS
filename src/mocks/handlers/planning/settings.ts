import {
  incidentListIssues,
  INCIDENT_LISTS,
  isPlanningSettingsSection,
  offeredChannels,
  PLANNING_SETTING_FIELDS,
  PLANNING_SETTINGS_SECTIONS,
  planningSettingsIssues,
  DEFAULT_PLANNING_SETTINGS,
  type IncidentSettings,
  type PlanningSettings
} from '@/modules/planning/planning-settings/domain/planningSettings'
import type { PlanningCircuitApi } from '@/modules/planning/planning-settings/types/planningSettings.types'
import { invalidField } from '../../http/input'
import { unprocessable } from '../../http/errors'
import type { PlanningSettingsApi } from '@/modules/planning/planning-settings/types/planningSettings.types'
import type { MockDatabase } from '../../db/database'
import { PLANNING_SETTINGS_NO } from '../../fixtures/planning/settings'
import { readBody, routeParam, stampModified } from '../../http/crudResource'
import { notFound } from '../../http/errors'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { readSettingField, settingFieldError } from '../../http/settings'
import { CIRCUIT_MESSAGES } from './circuitMessages'
import { PLANNING_MESSAGES } from './messages'

export function planningSettings(db: MockDatabase): PlanningSettings {
  const row = db.planningSettings.findOrFail(PLANNING_SETTINGS_NO) as Partial<PlanningSettings>
  const defaults = structuredClone(DEFAULT_PLANNING_SETTINGS)
  // A record saved before a section or a field existed reads its defaults.
  const sections = Object.fromEntries(
    PLANNING_SETTINGS_SECTIONS.map((section) => [
      section,
      { ...defaults[section], ...(row[section] ?? {}) }
    ])
  ) as unknown as Omit<PlanningSettings, 'incidents'>
  return { ...sections, incidents: row.incidents ?? defaults.incidents }
}

/** What the screens need to adapt to the company's order circuit, readable by every user. */
export function planningCircuit(db: MockDatabase): PlanningCircuitApi {
  const settings = planningSettings(db)
  return {
    intake: settings.intake,
    channels: offeredChannels(settings.channels),
    externalReferenceLabel: settings.requests.externalReferenceLabel,
    externalReferenceRequired: settings.requests.externalReferenceRequired,
    countingUnit: settings.goods.countingUnit,
    expiredDateMode: settings.requests.expiredDateMode
  }
}

/** The three lists sent whole; codes and names are trimmed, the active flag defaults to true. */
function readIncidentLists(body: Record<string, unknown>): IncidentSettings {
  const read = (list: string, withType: boolean) => {
    const raw = body[list]
    if (!Array.isArray(raw)) throw invalidField(list)
    return raw.map((item: unknown) => {
      if (!item || typeof item !== 'object') throw invalidField(list)
      const row = item as Record<string, unknown>
      const text = (field: string) => {
        const value = row[field]
        if (value != null && typeof value !== 'string') throw invalidField(list)
        return (value ?? '').trim()
      }
      if (row.active != null && typeof row.active !== 'boolean') throw invalidField(list)
      return {
        no: text('no').toUpperCase(),
        name: text('name'),
        active: row.active !== false,
        ...(withType ? { reasonTypeNo: text('reasonTypeNo').toUpperCase() } : {})
      }
    })
  }
  return {
    incidentTypes: read('incidentTypes', false),
    reasonTypes: read('reasonTypes', false),
    reasonCodes: read('reasonCodes', true) as IncidentSettings['reasonCodes']
  }
}

/** One settings record for transport planning, saved one section at a time. */
export function registerPlanningSettingsHandlers(router: MockRouter, db: MockDatabase): void {
  const toApi = (): PlanningSettingsApi => {
    const row = planningSettings(db)
    const sections = Object.fromEntries(
      PLANNING_SETTINGS_SECTIONS.map((section) => [section, row[section]])
    ) as unknown as PlanningSettings
    const stored = db.planningSettings.findOrFail(PLANNING_SETTINGS_NO)
    return {
      ...sections,
      incidents: row.incidents,
      modifiedAt: stored.modifiedAt,
      modifiedBy: stored.modifiedBy
    }
  }

  router.get('/planning/settings', { feature: 'PLANNINGSETTINGS', action: 'read' }, () =>
    ok(toApi())
  )

  // Any signed-in user: the order form, the order card and the confirmations adapt to it.
  router.get('/planning/settings/circuit', {}, () => ok(planningCircuit(db)))

  /* The incident types, reason types and reason codes used for cancellations and deviations
   * (TRS07-US06): sent whole, a reason code always belongs to a known reason type. */
  router.put(
    '/planning/settings/incidents',
    { feature: 'PLANNINGSETTINGS', action: 'update' },
    (request) => {
      const lists = readIncidentLists(readBody(request))
      const [issue] = incidentListIssues(lists)
      if (issue) throw unprocessable(CIRCUIT_MESSAGES[`incident_${issue}`])
      for (const list of INCIDENT_LISTS) if (!lists[list].length) throw invalidField(list)
      db.planningSettings.update(PLANNING_SETTINGS_NO, {
        incidents: lists,
        ...stampModified(request)
      })
      return ok(toApi())
    }
  )

  router.put(
    '/planning/settings/:section',
    { feature: 'PLANNINGSETTINGS', action: 'update' },
    (request) => {
      const section = routeParam(request, 'section')
      if (!isPlanningSettingsSection(section)) {
        throw notFound(PLANNING_MESSAGES.unknownSettingsSection)
      }
      // A field left out keeps its value: a screen sends only the fields it knows.
      const body = {
        ...(planningSettings(db)[section] as unknown as Record<string, unknown>),
        ...readBody(request)
      }
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
