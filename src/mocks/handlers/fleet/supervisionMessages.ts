import type { LocalizedText } from '../../i18n'

/** Messages of the supervision and reporting screens: live map, history, fleet status sending. */
export const SUPERVISION_MESSAGES = {
  periodInvalid: {
    fr: 'La période est invalide : indiquez un début et une fin, le début avant la fin.',
    en: 'The period is invalid: give a start and an end, the start before the end.'
  },
  periodTooLong: {
    fr: 'La période ne peut pas dépasser {days} jours.',
    en: 'The period cannot be longer than {days} days.'
  },
  comparisonInvalid: {
    fr: 'La comparaison est incomplète : indiquez la seconde période ou le second site.',
    en: 'The comparison is incomplete: give the second period or the second site.'
  },
  recipientsRequired: {
    fr: 'Indiquez au moins un destinataire.',
    en: 'Give at least one recipient.'
  },
  recipientInvalid: {
    fr: "L'adresse e-mail « {email} » n'est pas valide.",
    en: 'The email address "{email}" is not valid.'
  },
  tooManyRecipients: {
    fr: "L'état de flotte ne peut partir qu'à {max} destinataires au plus.",
    en: 'The fleet status can go to {max} recipients at most.'
  },
  fleetStatusDayUnknown: {
    fr: "Aucun état de flotte n'est conservé pour ce jour.",
    en: 'No fleet status is kept for this day.'
  }
} satisfies Record<string, LocalizedText>
