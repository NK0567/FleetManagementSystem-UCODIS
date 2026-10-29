import { COMPANY } from '../../fixtures/company'
import { EXTERNAL_STAFF } from '../../fixtures/hr/externalStaff'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import { stampCreated, stampModified } from '../../http/crudResource'
import { conflict } from '../../http/errors'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import type { MockRequest } from '../../http/types'
import type { LocalizedText } from '../../i18n'
import type { StaffSyncReport } from '@/modules/hr/employees/types/employee.types'
import { integrationSettings } from '../fleet/settingsLists'

export const STAFF_SYNC_MESSAGES = {
  hrSystemOwns: {
    fr: 'Les personnes viennent du système de gestion du personnel : synchronisez-les au lieu de les saisir.',
    en: 'People come from the HR system: synchronize them instead of typing them in.'
  },
  noHrSystem: {
    fr: "Aucun système de gestion du personnel n'est déclaré dans les réglages de la flotte.",
    en: 'No HR system is declared in the fleet settings.'
  }
} satisfies Record<string, LocalizedText>

/** Fields the HR system is the reference for; the fleet keeps its own (driving authorization). */
const SYNCED_FIELDS = [
  'firstName',
  'lastName',
  'jobPositionNo',
  'orgUnitNo',
  'categoryNo',
  'siteCode',
  'phone',
  'email',
  'contractType',
  'hireDate'
] as const

/**
 * Takes the people of the HR system (simulated): a person is matched by identity document; a new
 * one is created, a known one gets the values of the HR system.
 */
export function synchronizeStaff(db: MockDatabase, request: MockRequest): StaffSyncReport {
  const report: StaffSyncReport = { created: [], updated: [], unchanged: 0, skipped: [] }
  const known = (collection: { find: (no: string) => unknown }, no: string) => !!collection.find(no)
  for (const record of EXTERNAL_STAFF) {
    const missing = [
      ['jobPositionNo', known(db.jobPositions, record.jobPositionNo)],
      ['orgUnitNo', known(db.orgUnits, record.orgUnitNo)],
      ['categoryNo', known(db.employeeCategories, record.categoryNo)],
      ['siteCode', known(db.sites, record.siteCode)]
    ].find(([, ok]) => !ok)
    if (missing) {
      report.skipped.push({ externalId: record.externalId, reason: String(missing[0]) })
      continue
    }
    const existing = db.employees.all().find((row) => row.nationalId === record.nationalId)
    if (existing) {
      const patch = Object.fromEntries(
        SYNCED_FIELDS.filter((field) => existing[field] !== record[field]).map((field) => [
          field,
          record[field]
        ])
      )
      if (Object.keys(patch).length === 0) {
        report.unchanged++
        continue
      }
      db.employees.update(existing.no, { ...patch, ...stampModified(request) })
      report.updated.push(existing.no)
      continue
    }
    const no = nextNo(
      db.employees.all().map((row) => row.no),
      COMPANY.employeeNoPrefix,
      COMPANY.employeeNoWidth
    )
    db.employees.insert(
      stampCreated(
        {
          no,
          ...Object.fromEntries(SYNCED_FIELDS.map((field) => [field, record[field]])),
          nationalId: record.nationalId,
          idDocumentType: 'national_id' as const,
          birthDate: null,
          birthPlace: '',
          gender: null,
          maritalStatus: null,
          exitDate: null,
          status: 'active' as const,
          statusReason: '',
          drivingAuthorized: false,
          drivingAuthorizedBy: null,
          drivingAuthorizedAt: null
        } as Parameters<typeof db.employees.insert>[0],
        request
      )
    )
    report.created.push(no)
  }
  return report
}

export function registerStaffSyncHandlers(router: MockRouter, db: MockDatabase): void {
  router.post('/hr/employees/sync', { feature: 'EMPLOYEE', action: 'insert' }, (request) => {
    if (!integrationSettings(db).hrSystemConnected) throw conflict(STAFF_SYNC_MESSAGES.noHrSystem)
    return ok(synchronizeStaff(db, request))
  })
}
