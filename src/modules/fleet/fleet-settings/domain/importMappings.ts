import { normalizeHeader, type ImportColumns } from '@/core/utils/csvImport'
import { REFILL_IMPORT_COLUMNS } from '@/modules/fleet/fuel-refills/domain/refillImport'
import { VEHICLE_IMPORT_COLUMNS } from '@/modules/fleet/vehicles/domain/vehicleImport'
import { EMPLOYEE_IMPORT_COLUMNS } from '@/modules/hr/employees/domain/employeeImport'
import { HISTORY_IMPORT_COLUMNS } from '@/modules/maintenance/work-orders/domain/historyImport'

export const IMPORT_KINDS = ['vehicles', 'people', 'refills', 'maintenanceHistory'] as const
export type ImportKind = (typeof IMPORT_KINDS)[number]

/** The default column names of each import, by field. */
export const IMPORT_DEFAULT_COLUMNS: Record<ImportKind, ImportColumns<string>> = {
  vehicles: VEHICLE_IMPORT_COLUMNS,
  people: EMPLOYEE_IMPORT_COLUMNS,
  refills: REFILL_IMPORT_COLUMNS,
  maintenanceHistory: HISTORY_IMPORT_COLUMNS
}

/** The heading of the source file the administrator gave for each field; empty keeps the defaults. */
export type ImportMapping = Record<string, string>
export type ImportMappings = Record<ImportKind, ImportMapping>

export const DEFAULT_IMPORT_MAPPINGS: ImportMappings = {
  vehicles: {},
  people: {},
  refills: {},
  maintenanceHistory: {}
}

export const IMPORT_HEADER_MAX_LENGTH = 60

export function isImportKind(value: string): value is ImportKind {
  return (IMPORT_KINDS as readonly string[]).includes(value)
}

export type ImportMappingIssue =
  | { code: 'unknownField'; field: string }
  | { code: 'tooLong'; field: string; max: number }
  | { code: 'sameHeading'; field: string; other: string }

/** What prevents a mapping from being saved; empty when it is valid. */
export function importMappingIssues(
  kind: ImportKind,
  mapping: ImportMapping
): ImportMappingIssue[] {
  const fields = Object.keys(IMPORT_DEFAULT_COLUMNS[kind])
  const issues: ImportMappingIssue[] = []
  const seen = new Map<string, string>()
  for (const [field, raw] of Object.entries(mapping)) {
    if (!fields.includes(field)) {
      issues.push({ code: 'unknownField', field })
      continue
    }
    const heading = raw.trim()
    if (!heading) continue
    if (heading.length > IMPORT_HEADER_MAX_LENGTH) {
      issues.push({ code: 'tooLong', field, max: IMPORT_HEADER_MAX_LENGTH })
    }
    const key = normalizeHeader(heading)
    const other = seen.get(key)
    if (other) issues.push({ code: 'sameHeading', field, other })
    seen.set(key, field)
  }
  return issues
}
