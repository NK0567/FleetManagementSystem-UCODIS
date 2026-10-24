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

const NUMBER_FIELDS: readonly RefillImportField[] = ['liters', 'unitPrice', 'odometerKm']
const YES = new Set(['oui', 'o', 'yes', 'y', '1', 'vrai', 'true', 'x'])

export function normalizeHeader(header: string): string {
  return header
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
}

/** Which import field each header of the file feeds; unknown headers are left out. */
export function mapHeaders(headers: readonly string[]): Map<string, RefillImportField> {
  const mapping = new Map<string, RefillImportField>()
  for (const header of headers) {
    const name = normalizeHeader(header)
    const field = (Object.keys(REFILL_IMPORT_COLUMNS) as RefillImportField[]).find((key) =>
      (REFILL_IMPORT_COLUMNS[key] as readonly string[]).includes(name)
    )
    if (field) mapping.set(header, field)
  }
  return mapping
}

export function missingColumns(mapping: Map<string, RefillImportField>): RefillImportField[] {
  const found = new Set(mapping.values())
  return (['plate', 'refueledAt', 'liters', 'unitPrice', 'odometerKm'] as const).filter(
    (field) => !found.has(field)
  )
}

/** Accepts 2026-09-03 15:00 and 03/09/2026 15:00; anything else is passed on for the server to refuse. */
export function parseImportDateTime(value: string): string {
  const text = value.trim()
  const french = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2}))?$/.exec(text)
  if (french) {
    const [, day, month, year, hour = '00', minute = '00'] = french
    return `${year}-${month!.padStart(2, '0')}-${day!.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute}`
  }
  const iso = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{1,2}):(\d{2}))?$/.exec(text)
  if (iso) return `${iso[1]}T${(iso[2] ?? '00').padStart(2, '0')}:${iso[3] ?? '00'}`
  return text
}

/** A decimal comma and spaces between thousands are accepted; a blank cell stays empty. */
export function parseImportNumber(value: string): number | string | null {
  const text = value.replace(/\s/g, '').replace(',', '.')
  if (!text) return null
  const number = Number(text)
  return Number.isNaN(number) ? value : number
}

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
