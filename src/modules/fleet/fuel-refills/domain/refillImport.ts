import {
  mapHeaders as mapColumns,
  missingColumns as missingOf,
  parseImportDateTime,
  parseImportNumber
} from '@/core/utils/csvImport'

/** Column names a refill file may use, in French or English; the first one goes into the template. */
export const REFILL_IMPORT_COLUMNS = {
  plate: ['immatriculation', 'plaque', 'plate'],
  refueledAt: ['date', 'date_heure', 'refueled_at'],
  liters: ['litres', 'liters'],
  unitPrice: ['prix_litre', 'prix_unitaire', 'unit_price'],
  odometerKm: ['compteur', 'kilometrage', 'odometer'],
  stationName: ['station'],
  fullTank: ['plein_complet', 'full_tank'],
  driverNo: ['matricule_conducteur', 'driver_no']
} as const

export type RefillImportField = keyof typeof REFILL_IMPORT_COLUMNS

export const REFILL_REQUIRED: readonly RefillImportField[] = [
  'plate',
  'refueledAt',
  'liters',
  'unitPrice',
  'odometerKm'
]

const NUMBER_FIELDS: readonly RefillImportField[] = ['liters', 'unitPrice', 'odometerKm']
const YES = new Set(['oui', 'o', 'yes', 'y', '1', 'vrai', 'true', 'x'])

export const mapHeaders = (headers: readonly string[]) => mapColumns(REFILL_IMPORT_COLUMNS, headers)

export const missingColumns = (mapping: Map<string, RefillImportField>) =>
  missingOf(mapping, REFILL_REQUIRED)

/** One line of the file, as the server expects it. */
export function toImportRow(
  record: Record<string, string>,
  mapping: Map<string, RefillImportField>
): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  for (const [header, field] of mapping) {
    const value = (record[header] ?? '').trim()
    if (field === 'refueledAt') row[field] = parseImportDateTime(value)
    else if (NUMBER_FIELDS.includes(field)) row[field] = parseImportNumber(value)
    else if (field === 'fullTank') row[field] = value ? YES.has(value.toLowerCase()) : true
    else row[field] = value || null
  }
  return row
}
