import type { LocalizedText } from '../../i18n'

export const SELF_SERVICE_MESSAGES = {
  noEmployee: {
    fr: "Ce compte n'est lié à aucun employé.",
    en: 'This account is not linked to an employee.'
  },
  noTour: {
    fr: 'Aucune tournée ne vous est confiée.',
    en: 'No tour is assigned to you.'
  }
} satisfies Record<string, LocalizedText>
