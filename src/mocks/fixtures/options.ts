import type { EnrichOption } from '@/types/options.types'
import type { UserProfileCode } from '@/types/auth.types'
import { localize, type LocalizedText, type MockLanguage } from '../i18n'

interface OptionDefinition {
  value: string | number
  label: LocalizedText
}

const userProfile: Record<UserProfileCode, LocalizedText> = {
  ADMIN: { fr: 'Administrateur', en: 'Administrator' },
  FLEET_MANAGER: { fr: 'Responsable flotte', en: 'Fleet manager' },
  MAINTENANCE_TECHNICIAN: { fr: 'Maintenancier', en: 'Maintenance technician' },
  CUSTOMER_SERVICE: { fr: 'Chargé de clientèle', en: 'Customer service' },
  SALES: { fr: 'Équipe commerciale', en: 'Sales team' },
  DEPOT: { fr: 'Équipe dépôt', en: 'Depot team' },
  MANAGEMENT: { fr: 'Direction', en: 'Management' },
  DRIVER: { fr: 'Conducteur', en: 'Driver' },
  DRIVER_ASSISTANT: { fr: 'Aide conducteur', en: 'Driver assistant' }
}

function fromRecord(record: Record<string, LocalizedText>): OptionDefinition[] {
  return Object.entries(record).map(([value, label]) => ({ value, label }))
}

const OPTION_RECORDS: Record<string, Record<string, LocalizedText>> = {
  userProfile
}

/** Enumerations served by GET /options/all. */
export const OPTION_SETS: Record<string, OptionDefinition[]> = Object.fromEntries(
  Object.entries(OPTION_RECORDS).map(([key, record]) => [key, fromRecord(record)])
)

export function optionsFor(language: MockLanguage): Record<string, EnrichOption[]> {
  return Object.fromEntries(
    Object.entries(OPTION_SETS).map(([key, definitions]) => [
      key,
      definitions.map((option) => ({
        value: option.value,
        description: localize(language, option.label)
      }))
    ])
  )
}

export function optionLabel(language: MockLanguage, set: string, value: unknown): string {
  const option = OPTION_SETS[set]?.find((candidate) => String(candidate.value) === String(value))
  return option ? localize(language, option.label) : String(value ?? '')
}
