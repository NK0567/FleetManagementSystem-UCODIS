import type { CompanySettingsApi } from '@/modules/settings/company/types/companySettings.types'
import type { MockDatabase } from '../../db/database'
import { COMPANY_SETTINGS_NO, type CompanySettingsRow } from '../../fixtures/settings/company'
import { readBody, stampModified } from '../../http/crudResource'
import { readString } from '../../http/input'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'

const TEXT_FIELDS = [
  'legalName',
  'entityName',
  'displayName',
  'activity',
  'address',
  'country',
  'taxId'
] as const
const REQUIRED = new Set<string>(['legalName', 'entityName', 'country'])

/** The identity of the company and the size of its park, counted from the vehicles in service. */
export function companySettingsApi(db: MockDatabase): CompanySettingsApi {
  const row = db.companySettings.findOrFail(COMPANY_SETTINGS_NO)
  const motorized = new Map(db.vehicleTypes.all().map((type) => [type.no, type.motorized]))
  const inService = db.vehicles.all().filter((vehicle) => !vehicle.removal)
  const tractorCount = inService.filter((vehicle) => motorized.get(vehicle.vehicleTypeNo)).length
  return {
    legalName: row.legalName,
    entityName: row.entityName,
    displayName: row.displayName,
    activity: row.activity,
    address: row.address,
    country: row.country,
    taxId: row.taxId,
    tractorCount,
    trailerCount: inService.length - tractorCount,
    vehicleCount: inService.length,
    modifiedAt: row.modifiedAt,
    modifiedBy: row.modifiedBy
  }
}

export function registerCompanySettingsHandlers(router: MockRouter, db: MockDatabase): void {
  /** The name shown next to the logo; read before sign-in, so it needs no permission. */
  router.get('/settings/brand', { public: true }, () =>
    ok({ displayName: db.companySettings.findOrFail(COMPANY_SETTINGS_NO).displayName })
  )

  router.get('/settings/company', { feature: 'COMPANYSETTINGS', action: 'read' }, () =>
    ok(companySettingsApi(db))
  )

  router.patch('/settings/company', { feature: 'COMPANYSETTINGS', action: 'update' }, (request) => {
    const body = readBody(request)
    const patch: Partial<CompanySettingsRow> = {}
    for (const field of TEXT_FIELDS) {
      if (field in body) patch[field] = readString(body, field, { required: REQUIRED.has(field) })
    }
    db.companySettings.update(COMPANY_SETTINGS_NO, { ...patch, ...stampModified(request) })
    return ok(companySettingsApi(db))
  })
}
