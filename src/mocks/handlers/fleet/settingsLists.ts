import {
  SCORE_SOURCES,
  scoreFamiliesIssues,
  type ScoreFamilyRule,
  type ScoreSource
} from '@/modules/fleet/drivers/domain/driverScore'
import {
  DEFAULT_FLEET_SETTINGS,
  type IntegrationSettings
} from '@/modules/fleet/fleet-settings/domain/fleetSettings'
import {
  DEFAULT_IMPORT_MAPPINGS,
  importMappingIssues,
  isImportKind,
  type ImportMapping,
  type ImportMappings
} from '@/modules/fleet/fleet-settings/domain/importMappings'
import {
  DEFAULT_INDICATORS,
  indicatorIssues,
  type IndicatorKey,
  type IndicatorSetting
} from '@/modules/fleet/fleet-settings/domain/indicators'
import type { FleetSettingsLists } from '@/modules/fleet/fleet-settings/types/fleetSettings.types'
import type { MockDatabase } from '../../db/database'
import { DEFAULT_FLEET_SETTINGS_LISTS, FLEET_SETTINGS_NO } from '../../fixtures/fleet/settings'
import { MAINTENANCE_SETTINGS_NO } from '../../fixtures/maintenance/settings'
import { notFound, unprocessable } from '../../http/errors'
import { readBody, routeParam, stampModified } from '../../http/crudResource'
import { invalidField } from '../../http/input'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import type { LocalizedText } from '../../i18n'

export const SETTINGS_LIST_MESSAGES = {
  scoreFamilies: {
    fr: 'Les familles du score ne peuvent pas être enregistrées : {reason}',
    en: 'The score families cannot be saved: {reason}'
  },
  importMapping: {
    fr: 'La correspondance des colonnes ne peut pas être enregistrée : {reason}',
    en: 'The column mapping cannot be saved: {reason}'
  },
  indicators: {
    fr: 'Les indicateurs ne peuvent pas être enregistrés : {reason}',
    en: 'The indicators cannot be saved: {reason}'
  },
  unknownImport: { fr: "Cet import n'existe pas.", en: 'This import does not exist.' }
} satisfies Record<string, LocalizedText>

const REASONS: Record<string, LocalizedText> = {
  noFamily: { fr: 'il faut au moins une famille', en: 'at least one family is needed' },
  noWeight: {
    fr: 'au moins une famille doit avoir un poids',
    en: 'at least one family needs a weight'
  },
  codeRequired: { fr: 'une famille n’a pas de code', en: 'a family has no code' },
  codeInvalid: {
    fr: 'un code ne contient que des lettres, chiffres et _ (20 au plus), et commence par une lettre',
    en: 'a code holds only letters, digits and _ (20 at most), and starts with a letter'
  },
  labelRequired: { fr: 'une famille n’a pas de libellé', en: 'a family has no label' },
  weightOutOfRange: {
    fr: 'un poids va de 0 à 100',
    en: 'a weight goes from 0 to 100'
  },
  duplicateCode: { fr: 'deux familles ont le même code', en: 'two families share a code' },
  noSource: {
    fr: 'une famille ne compte aucun élément',
    en: 'a family counts nothing'
  },
  sourceTwice: {
    fr: 'un même élément est compté dans deux familles',
    en: 'one element is counted in two families'
  },
  unknownField: { fr: 'un champ est inconnu', en: 'a field is unknown' },
  tooLong: { fr: 'un intitulé est trop long', en: 'a heading is too long' },
  sameHeading: {
    fr: 'deux champs lisent la même colonne',
    en: 'two fields read the same column'
  },
  unknownIndicator: { fr: 'un indicateur est inconnu', en: 'an indicator is unknown' },
  missingIndicator: { fr: 'un indicateur manque', en: 'an indicator is missing' },
  targetOutOfRange: {
    fr: 'une cible sort des bornes de son indicateur',
    en: 'a target is outside the bounds of its indicator'
  }
}

const INDICATOR_REASONS: Record<string, LocalizedText> = {
  ...REASONS,
  codeRequired: { fr: 'un indicateur n’a pas de code', en: 'an indicator has no code' },
  codeInvalid: {
    fr: 'un code ne contient que des majuscules, chiffres et _ (12 au plus)',
    en: 'a code holds only capitals, digits and _ (12 at most)'
  },
  duplicateCode: { fr: 'deux indicateurs ont le même code', en: 'two indicators share a code' },
  labelRequired: { fr: 'un indicateur n’a pas de libellé', en: 'an indicator has no label' }
}

function settingsRow(db: MockDatabase) {
  return db.fleetSettings.findOrFail(FLEET_SETTINGS_NO)
}

/** Outside systems; a record saved before they existed falls back on the defaults. */
export function integrationSettings(db: MockDatabase): IntegrationSettings {
  return settingsRow(db).integrations ?? DEFAULT_FLEET_SETTINGS.integrations
}

export function scoreFamiliesOf(db: MockDatabase): ScoreFamilyRule[] {
  return settingsRow(db).scoreFamilies ?? DEFAULT_FLEET_SETTINGS_LISTS.scoreFamilies
}

export function importMappingsOf(db: MockDatabase): ImportMappings {
  return { ...DEFAULT_IMPORT_MAPPINGS, ...(settingsRow(db).importMappings ?? {}) }
}

/**
 * The indicators; the availability target is the one the park dashboard compares against, kept
 * in the reporting settings, so that it is set in one place only.
 */
export function indicatorsOf(db: MockDatabase): IndicatorSetting[] {
  const row = settingsRow(db)
  const saved = row.indicators ?? DEFAULT_INDICATORS
  const shared = sharedTargets(db)
  return DEFAULT_INDICATORS.map((fallback) => {
    const indicator = saved.find((item) => item.key === fallback.key) ?? fallback
    const target = shared[indicator.key]
    return target !== undefined ? { ...indicator, target } : indicator
  })
}

/**
 * Targets also set on the dashboards' own settings: the fleet availability in the reporting
 * section, the maintenance ones in the maintenance settings. They are read and written there, so
 * that each target is held in one place only.
 */
function sharedTargets(db: MockDatabase): Partial<Record<IndicatorKey, number>> {
  const reporting = settingsRow(db).reporting
  const maintenance = db.maintenanceSettings.find(MAINTENANCE_SETTINGS_NO)?.targets
  const targets: Partial<Record<IndicatorKey, number>> = {}
  if (reporting?.availabilityTargetPct !== undefined) {
    targets.availabilityRate = reporting.availabilityTargetPct
  }
  if (maintenance) {
    targets.preventiveShare = maintenance.preventiveShareTargetPct
    targets.mttr = maintenance.mttrTargetHours
    targets.mtbf = maintenance.mtbfTargetKm
  }
  return targets
}

function saveSharedTargets(
  db: MockDatabase,
  indicators: readonly IndicatorSetting[],
  request: Parameters<typeof stampModified>[0]
) {
  const target = (key: IndicatorKey) => indicators.find((item) => item.key === key)?.target ?? null
  const maintenance = db.maintenanceSettings.find(MAINTENANCE_SETTINGS_NO)
  if (maintenance?.targets) {
    const targets = {
      ...maintenance.targets,
      preventiveShareTargetPct:
        target('preventiveShare') ?? maintenance.targets.preventiveShareTargetPct,
      mttrTargetHours: target('mttr') ?? maintenance.targets.mttrTargetHours,
      mtbfTargetKm: target('mtbf') ?? maintenance.targets.mtbfTargetKm
    }
    db.maintenanceSettings.update(MAINTENANCE_SETTINGS_NO, { targets, ...stampModified(request) })
  }
}

export function settingsLists(db: MockDatabase): FleetSettingsLists {
  return {
    scoreFamilies: scoreFamiliesOf(db),
    importMappings: importMappingsOf(db),
    indicators: indicatorsOf(db)
  }
}

const text = (value: unknown) => (typeof value === 'string' ? value : '')

function readFamilies(body: Record<string, unknown>): ScoreFamilyRule[] {
  const raw = body.families
  if (!Array.isArray(raw)) throw invalidField('families')
  return raw.map((item: unknown) => {
    const row = (item ?? {}) as Record<string, unknown>
    const sources = Array.isArray(row.sources) ? row.sources : []
    if (sources.some((source) => !(SCORE_SOURCES as readonly unknown[]).includes(source))) {
      throw invalidField('sources')
    }
    const weight = Number(row.weight)
    return {
      code: text(row.code).trim(),
      label: text(row.label).trim(),
      weight: Number.isFinite(weight) ? weight : -1,
      sources: [...new Set(sources as ScoreSource[])]
    }
  })
}

function readMapping(body: Record<string, unknown>): ImportMapping {
  const raw = body.mapping
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw invalidField('mapping')
  const mapping: ImportMapping = {}
  for (const [field, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value != null && typeof value !== 'string') throw invalidField(field)
    if (typeof value === 'string' && value.trim()) mapping[field] = value.trim()
  }
  return mapping
}

function readIndicators(body: Record<string, unknown>): IndicatorSetting[] {
  const raw = body.indicators
  if (!Array.isArray(raw)) throw invalidField('indicators')
  return raw.map((item: unknown) => {
    const row = (item ?? {}) as Record<string, unknown>
    const target = row.target == null || row.target === '' ? null : Number(row.target)
    return {
      key: text(row.key) as IndicatorKey,
      code: text(row.code).trim().toUpperCase(),
      label: text(row.label).trim(),
      target: target === null || Number.isFinite(target) ? target : Number.NaN
    }
  })
}

/** Registered before the sections of the settings, whose route would take these paths. */
export function registerSettingsListsHandlers(router: MockRouter, db: MockDatabase): void {
  const save = (patch: Record<string, unknown>, request: Parameters<typeof stampModified>[0]) =>
    db.fleetSettings.update(FLEET_SETTINGS_NO, { ...patch, ...stampModified(request) })

  router.put(
    '/fleet/settings/score-families',
    { feature: 'FLEETSETTINGS', action: 'update' },
    (request) => {
      const families = readFamilies(readBody(request))
      const [issue] = scoreFamiliesIssues(families)
      if (issue) {
        throw unprocessable(SETTINGS_LIST_MESSAGES.scoreFamilies, {
          reason: request.language === 'en' ? REASONS[issue.code]!.en : REASONS[issue.code]!.fr
        })
      }
      save({ scoreFamilies: families }, request)
      return ok(scoreFamiliesOf(db))
    }
  )

  router.put(
    '/fleet/settings/indicators',
    { feature: 'FLEETSETTINGS', action: 'update' },
    (request) => {
      const indicators = readIndicators(readBody(request))
      const [issue] = indicatorIssues(indicators)
      if (issue) {
        const reason = INDICATOR_REASONS[issue.code]!
        throw unprocessable(SETTINGS_LIST_MESSAGES.indicators, {
          reason: request.language === 'en' ? reason.en : reason.fr
        })
      }
      const availability = indicators.find((item) => item.key === 'availabilityRate')
      const row = settingsRow(db)
      saveSharedTargets(db, indicators, request)
      save(
        {
          indicators,
          ...(availability?.target != null
            ? {
                reporting: {
                  ...(row.reporting ?? DEFAULT_FLEET_SETTINGS.reporting),
                  availabilityTargetPct: availability.target
                }
              }
            : {})
        },
        request
      )
      return ok(indicatorsOf(db))
    }
  )

  router.put(
    '/fleet/settings/import-mappings/:kind',
    { feature: 'FLEETSETTINGS', action: 'update' },
    (request) => {
      const kind = routeParam(request, 'kind')
      if (!isImportKind(kind)) throw notFound(SETTINGS_LIST_MESSAGES.unknownImport)
      const mapping = readMapping(readBody(request))
      const [issue] = importMappingIssues(kind, mapping)
      if (issue) {
        const reason = REASONS[issue.code]!
        throw unprocessable(SETTINGS_LIST_MESSAGES.importMapping, {
          reason: request.language === 'en' ? reason.en : reason.fr
        })
      }
      save({ importMappings: { ...importMappingsOf(db), [kind]: mapping } }, request)
      return ok(importMappingsOf(db)[kind])
    }
  )

  // Whoever runs an import reads the headings the administrator set for it.
  router.get('/fleet/import-mappings/:kind', {}, (request) => {
    const kind = routeParam(request, 'kind')
    if (!isImportKind(kind)) throw notFound(SETTINGS_LIST_MESSAGES.unknownImport)
    return ok(importMappingsOf(db)[kind])
  })
}
