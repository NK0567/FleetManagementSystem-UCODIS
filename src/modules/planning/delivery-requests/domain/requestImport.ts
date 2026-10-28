import { parseImportDateTime, parseImportNumber, type ImportColumns } from '@/core/utils/csvImport'

/** Column names a request file may use, in French or English; the first goes into the template. */
export const REQUEST_IMPORT_COLUMNS = {
  ordererNo: ['client', 'donneur_ordre', 'orderer'],
  deliveryPointNo: ['point_livraison', 'point', 'delivery_point'],
  productNo: ['produit', 'product'],
  quantity: ['quantite', 'quantity'],
  desiredDate: ['date_souhaitee', 'date', 'desired_date'],
  validUntil: ['valable_jusqu_au', 'validite', 'valid_until'],
  externalReference: ['reference', 'reference_client', 'customer_reference'],
  weightKg: ['poids_kg', 'poids', 'weight_kg'],
  comment: ['commentaire', 'comment']
} as const satisfies ImportColumns<string>

export type RequestImportField = keyof typeof REQUEST_IMPORT_COLUMNS

export const REQUEST_REQUIRED: readonly RequestImportField[] = [
  'ordererNo',
  'deliveryPointNo',
  'productNo',
  'quantity',
  'desiredDate'
]

/** One line of the file, as the server expects it; codes are upper-cased, nothing else is guessed. */
export function toRequestRow(
  record: Record<string, string>,
  mapping: Map<string, RequestImportField>
): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  for (const [header, field] of mapping) {
    const value = (record[header] ?? '').trim()
    if (field === 'desiredDate' || field === 'validUntil') {
      row[field] = value ? parseImportDateTime(value).slice(0, 10) : null
    } else if (field === 'quantity' || field === 'weightKg') row[field] = parseImportNumber(value)
    else if (field === 'ordererNo' || field === 'deliveryPointNo' || field === 'productNo') {
      row[field] = value.toUpperCase()
    } else row[field] = value
  }
  return row
}
