import {
  normalizeHeader,
  parseImportDateTime,
  parseImportNumber,
  type ImportColumns
} from '@/core/utils/csvImport'

/** Column names a maintenance history file may use, in French or English; the first goes into the template. */
export const HISTORY_IMPORT_COLUMNS = {
  plate: ['immatriculation', 'plaque', 'plate'],
  doneOn: ['date', 'date_intervention', 'done_on'],
  maintenanceType: ['type', 'type_maintenance', 'maintenance_type'],
  workDone: ['travaux', 'travaux_realises', 'work_done'],
  odometerKm: ['kilometrage', 'compteur', 'odometer'],
  cost: ['cout', 'montant', 'cost']
} as const satisfies ImportColumns<string>

export type HistoryImportField = keyof typeof HISTORY_IMPORT_COLUMNS

export const HISTORY_REQUIRED: readonly HistoryImportField[] = [
  'plate',
  'doneOn',
  'maintenanceType',
  'workDone',
  'cost'
]

const TYPE_WORDS: Record<string, 'corrective' | 'preventive'> = {
  correctif: 'corrective',
  corrective: 'corrective',
  curatif: 'corrective',
  preventif: 'preventive',
  preventive: 'preventive',
  entretien: 'preventive'
}

/** One line of the file, as the server expects it; unknown words are passed on for it to refuse. */
export function toHistoryRow(
  record: Record<string, string>,
  mapping: Map<string, HistoryImportField>
): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  for (const [header, field] of mapping) {
    const value = (record[header] ?? '').trim()
    if (field === 'doneOn') row[field] = parseImportDateTime(value).slice(0, 10)
    else if (field === 'odometerKm' || field === 'cost') row[field] = parseImportNumber(value)
    else if (field === 'maintenanceType') row[field] = TYPE_WORDS[normalizeHeader(value)] ?? value
    else row[field] = value
  }
  return row
}
