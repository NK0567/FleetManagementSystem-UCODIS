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
  comment: ['commentaire', 'comment'],
  notificationChannel: ['mode_notification', 'notification', 'notification_channel'],
  confirmationRequired: ['confirmation_requise', 'confirmation', 'confirmation_required'],
  preferredSlot: ['creneau', 'creneau_prefere', 'preferred_slot'],
  fullDeliveryRequired: ['livraison_complete', 'full_delivery']
} as const satisfies ImportColumns<string>

export type RequestImportField = keyof typeof REQUEST_IMPORT_COLUMNS

export const REQUEST_REQUIRED: readonly RequestImportField[] = [
  'ordererNo',
  'deliveryPointNo',
  'productNo',
  'quantity',
  'desiredDate'
]

const YES = ['oui', 'o', 'yes', 'y', '1', 'vrai', 'true', 'x']
const NO = ['non', 'n', 'no', '0', 'faux', 'false']
const CHANNELS: Record<string, string> = {
  aucun: 'none',
  aucune: 'none',
  appel: 'call',
  telephone: 'call',
  mail: 'email',
  'e-mail': 'email'
}
const SLOTS: Record<string, string> = {
  matin: 'morning',
  'apres-midi': 'afternoon',
  'après-midi': 'afternoon',
  apres_midi: 'afternoon',
  indifferent: 'any',
  indifférent: 'any'
}

/* A yes or no cell: an empty cell keeps the recipient's preference, any other word is sent as it
 * is so that the server rejects the row with a clear message instead of guessing. */
function parseYesNo(value: string): boolean | string | undefined {
  const word = value.toLowerCase()
  if (!word) return undefined
  if (YES.includes(word)) return true
  if (NO.includes(word)) return false
  return value
}

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
    } else if (field === 'confirmationRequired' || field === 'fullDeliveryRequired') {
      const flag = parseYesNo(value)
      if (flag !== undefined) row[field] = flag
    } else if (field === 'notificationChannel' || field === 'preferredSlot') {
      // Left empty, the preference comes from the recipient's record.
      const word = value.toLowerCase()
      if (word) row[field] = (field === 'notificationChannel' ? CHANNELS : SLOTS)[word] ?? word
    } else row[field] = value
  }
  return row
}
