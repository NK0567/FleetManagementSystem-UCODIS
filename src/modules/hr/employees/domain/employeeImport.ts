import { type ImportColumns } from '@/core/utils/csvImport'

/** Column names a staff file may use, in French or English; the first one goes into the template. */
export const EMPLOYEE_IMPORT_COLUMNS = {
  lastName: ['nom', 'last_name'],
  firstName: ['prenom', 'first_name'],
  jobPositionNo: ['fonction', 'poste', 'job_position'],
  orgUnitNo: ['entite', 'service', 'org_unit'],
  categoryNo: ['categorie', 'category'],
  siteCode: ['site', 'base'],
  phone: ['telephone', 'phone'],
  email: ['email', 'courriel', 'e_mail'],
  nationalId: ['piece_identite', 'cni', 'national_id'],
  contractType: ['contrat', 'type_contrat', 'contract_type'],
  hireDate: ['date_embauche', 'embauche', 'hire_date']
} as const satisfies ImportColumns<string>

export type EmployeeImportField = keyof typeof EMPLOYEE_IMPORT_COLUMNS

export const EMPLOYEE_REQUIRED: readonly EmployeeImportField[] = [
  'lastName',
  'firstName',
  'jobPositionNo',
  'orgUnitNo',
  'categoryNo',
  'siteCode',
  'phone',
  'nationalId',
  'hireDate'
]

const CONTRACT_WORDS: Record<string, string> = {
  cdi: 'permanent',
  permanent: 'permanent',
  cdd: 'fixed_term',
  fixed_term: 'fixed_term'
}

/** Accepts 03/09/2026 and 2026-09-03; anything else is passed on for the server to refuse. */
function parseDay(value: string): string {
  const french = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value)
  if (french) {
    const [, day, month, year] = french
    return `${year}-${month!.padStart(2, '0')}-${day!.padStart(2, '0')}`
  }
  return value
}

/** One line of the file, as the server expects it. */
export function toEmployeeRow(
  record: Record<string, string>,
  mapping: Map<string, EmployeeImportField>
): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  for (const [header, field] of mapping) {
    const value = (record[header] ?? '').trim()
    if (field === 'hireDate') row[field] = value ? parseDay(value) : null
    else if (field === 'contractType') {
      row[field] = value ? (CONTRACT_WORDS[value.toLowerCase()] ?? value) : 'permanent'
    } else row[field] = value || null
  }
  return row
}
