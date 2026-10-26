import {
  appliesToPerson,
  appliesToVehicle
} from '@/modules/fleet/document-types/domain/documentType'
import {
  complianceGaps,
  documentState,
  noticeDaysOf,
  notifyOn,
  type ComplianceGap,
  type DocumentState
} from '@/modules/fleet/documents/domain/document'
import { isOnStaff } from '@/modules/hr/employees/domain/employee'
import { todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import type { DocumentRow } from '../../fixtures/fleet/documents'
import { optionLabel } from '../../fixtures/options'
import type { MockLanguage } from '../../i18n'
import { fleetSettings } from './settings'

export interface DocumentStatus {
  state: DocumentState
  effectiveNoticeDays: number
  notifyOn: string | null
}

/** State of every document, from one rule shared with the page. */
export function documentStatuses(db: MockDatabase): Map<string, DocumentStatus> {
  const today = todayIso()
  const fallback = fleetSettings(db).documents.defaultNoticeDays
  const types = new Map(db.documentTypes.all().map((type) => [type.no, type]))
  return new Map(
    db.documents.all().map((document) => {
      const type = types.get(document.documentTypeNo)
      const effectiveNoticeDays = noticeDaysOf(
        document.noticeDays,
        type?.noticeDays ?? null,
        fallback
      )
      return [
        document.no,
        {
          state: documentState(document, type?.validity ?? 'limited', effectiveNoticeDays, today),
          effectiveNoticeDays,
          notifyOn: notifyOn(document.expiryDate, effectiveNoticeDays)
        }
      ]
    })
  )
}

export function currentDocuments(db: MockDatabase): DocumentRow[] {
  return db.documents.all().filter((document) => !document.replacedByNo)
}

/**
 * Mandatory documents each vehicle of the fleet and each person on staff lacks, or holds past
 * their validity. Vehicles and people are keyed by their number.
 */
export function documentCompliance(db: MockDatabase) {
  const statuses = documentStatuses(db)
  const types = db.documentTypes.all().filter((type) => type.mandatory)
  const current = currentDocuments(db)
  const bySubject = (target: DocumentRow['target'], subjectNo: string) =>
    current
      .filter((document) => document.target === target && document.subjectNo === subjectNo)
      .map((document) => ({
        documentTypeNo: document.documentTypeNo,
        state: statuses.get(document.no)?.state ?? 'valid'
      }))

  const vehicles = new Map<string, ComplianceGap[]>()
  for (const vehicle of db.vehicles.all().filter((row) => !row.removal)) {
    const mandatory = types.filter((type) => appliesToVehicle(type, vehicle.vehicleTypeNo))
    vehicles.set(
      vehicle.no,
      complianceGaps(
        mandatory.map((type) => type.no),
        bySubject('vehicle', vehicle.no)
      )
    )
  }

  const drives = new Set(
    db.jobPositions
      .all()
      .filter((position) => position.drives)
      .map((position) => position.no)
  )
  const persons = new Map<string, ComplianceGap[]>()
  for (const employee of db.employees.all().filter((row) => isOnStaff(row.status))) {
    const mandatory = types.filter((type) =>
      appliesToPerson(type, drives.has(employee.jobPositionNo))
    )
    persons.set(
      employee.no,
      complianceGaps(
        mandatory.map((type) => type.no),
        bySubject('person', employee.no)
      )
    )
  }

  return { vehicles, persons }
}

/** Gaps as the holder's card lists them: "Visite technique (Expiré), Carte grise (Manquant)". */
export function gapsText(
  db: MockDatabase,
  gaps: readonly ComplianceGap[],
  language: MockLanguage
): string {
  const names = new Map(db.documentTypes.all().map((type) => [type.no, type.name]))
  return gaps
    .map(
      (gap) =>
        `${names.get(gap.documentTypeNo) ?? gap.documentTypeNo} (${optionLabel(language, 'complianceGapReason', gap.reason)})`
    )
    .join(', ')
}

/** Gaps that make the document unusable on the road, as opposed to a document never recorded. */
export function invalidatingGaps(gaps: readonly ComplianceGap[]): ComplianceGap[] {
  return gaps.filter((gap) => gap.reason !== 'missing')
}
