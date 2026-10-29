import type { ImportColumns } from '@/core/utils/csvImport'

/** Column names a provider file may use, in French or English; the first one goes into the template. */
export const PROVIDER_IMPORT_COLUMNS = {
  name: ['nom', 'raison_sociale', 'name'],
  providerType: ['type', 'type_prestataire', 'provider_type'],
  contactName: ['contact', 'interlocuteur', 'contact_name'],
  phone: ['telephone', 'tel', 'phone'],
  email: ['email', 'e_mail', 'courriel', 'mail'],
  address: ['adresse', 'address']
} as const satisfies ImportColumns<string>

export type ProviderImportField = keyof typeof PROVIDER_IMPORT_COLUMNS

export const PROVIDER_REQUIRED: readonly ProviderImportField[] = ['name', 'providerType']

/** One line of the file, as the server expects it; the type is given by its code or its name. */
export function toProviderRow(
  record: Record<string, string>,
  mapping: Map<string, ProviderImportField>
): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  for (const [header, field] of mapping) row[field] = (record[header] ?? '').trim()
  return row
}
