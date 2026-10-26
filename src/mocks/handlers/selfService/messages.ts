import type { LocalizedText } from '../../i18n'

export const SELF_SERVICE_MESSAGES = {
  noEmployee: {
    fr: "Ce compte n'est lié à aucun employé.",
    en: 'This account is not linked to an employee.'
  }
} satisfies Record<string, LocalizedText>
