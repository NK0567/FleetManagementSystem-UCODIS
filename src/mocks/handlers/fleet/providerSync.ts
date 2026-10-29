import type { ProviderSyncReport } from '@/modules/fleet/providers/types/provider.types'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import { EXTERNAL_PROVIDERS } from '../../fixtures/fleet/externalProviders'
import { stampCreated, stampModified } from '../../http/crudResource'
import { conflict } from '../../http/errors'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import type { MockRequest } from '../../http/types'
import type { LocalizedText } from '../../i18n'
import { integrationSettings } from './settingsLists'

export const PROVIDER_SYNC_MESSAGES = {
  noManagementSystem: {
    fr: "Aucun système de gestion de l'entreprise n'est déclaré dans les réglages de la flotte.",
    en: 'No company management system is declared in the fleet settings.'
  },
  blocked: {
    fr: "Bloqué dans le système de gestion de l'entreprise.",
    en: 'Blocked in the company management system.'
  }
} satisfies Record<string, LocalizedText>

/**
 * Takes the third parties of the management system (simulated): a provider is matched by its
 * reference in that system, or else by name and type; the coordinates and the authorization of the
 * management system prevail, the contracts typed in the fleet stay.
 */
export function synchronizeProviders(db: MockDatabase, request: MockRequest): ProviderSyncReport {
  const report: ProviderSyncReport = { created: [], updated: [], unchanged: 0, skipped: [] }
  const blockedReason =
    request.language === 'en'
      ? PROVIDER_SYNC_MESSAGES.blocked.en
      : PROVIDER_SYNC_MESSAGES.blocked.fr
  for (const record of EXTERNAL_PROVIDERS) {
    if (!db.providerTypes.find(record.providerType)) {
      report.skipped.push({ externalId: record.externalId, reason: record.providerType })
      continue
    }
    const existing = db.providers
      .all()
      .find(
        (row) =>
          row.externalId === record.externalId ||
          (row.providerType === record.providerType &&
            row.name.toLowerCase() === record.name.toLowerCase())
      )
    const values = {
      name: record.name,
      providerType: record.providerType,
      contactName: record.contactName,
      phone: record.phone,
      email: record.email,
      address: record.address,
      authorized: !record.blocked,
      notAuthorizedReason: record.blocked ? blockedReason : '',
      source: 'management_system' as const,
      externalId: record.externalId
    }
    if (existing) {
      const changed = (Object.keys(values) as (keyof typeof values)[]).filter(
        (key) => existing[key] !== values[key]
      )
      if (!changed.length) {
        report.unchanged++
        continue
      }
      db.providers.update(existing.no, { ...values, ...stampModified(request) })
      report.updated.push(existing.no)
      continue
    }
    const no = nextNo(
      db.providers.all().map((row) => row.no),
      'PRS-',
      3
    )
    db.providers.insert(
      stampCreated({ no, ...values, contracts: [], carrierVehicles: [] }, request)
    )
    report.created.push(no)
  }
  return report
}

export function registerProviderSyncHandlers(router: MockRouter, db: MockDatabase): void {
  router.post('/fleet/providers/sync', { feature: 'PROVIDER', action: 'insert' }, (request) => {
    if (!integrationSettings(db).managementSystemConnected) {
      throw conflict(PROVIDER_SYNC_MESSAGES.noManagementSystem)
    }
    return ok(synchronizeProviders(db, request))
  })
}
