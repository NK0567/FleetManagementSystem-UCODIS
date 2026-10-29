import { parseImportDateTime, parseImportNumber } from '@/core/utils/csvImport'

/** Column names of a card supplier's statement, in French or English; the first goes into the template. */
export const TRANSACTION_IMPORT_COLUMNS = {
  cardNumber: ['numero_carte', 'carte', 'card_number'],
  transactedAt: ['date', 'date_heure', 'transacted_at'],
  station: ['station'],
  city: ['ville', 'city'],
  liters: ['litres', 'volume', 'liters'],
  amount: ['montant', 'amount']
} as const

export type TransactionImportField = keyof typeof TRANSACTION_IMPORT_COLUMNS

export const TRANSACTION_REQUIRED: readonly TransactionImportField[] = [
  'cardNumber',
  'transactedAt',
  'station',
  'city',
  'liters',
  'amount'
]

const NUMBER_FIELDS: readonly TransactionImportField[] = ['liters', 'amount']

/** One line of the statement, as the server expects it. */
export function toTransactionRow(
  record: Record<string, string>,
  mapping: Map<string, TransactionImportField>
): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  for (const [header, field] of mapping) {
    const value = (record[header] ?? '').trim()
    if (field === 'transactedAt') row[field] = parseImportDateTime(value)
    else if (NUMBER_FIELDS.includes(field)) row[field] = parseImportNumber(value)
    else row[field] = value
  }
  return row
}

/** Card numbers are compared without spaces, as statements print them in groups. */
export function normalizeCardNumber(number: string): string {
  return number.replace(/\s+/g, '').toUpperCase()
}
