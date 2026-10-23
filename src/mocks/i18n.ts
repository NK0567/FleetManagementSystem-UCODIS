export type MockLanguage = 'fr' | 'en'

/** A server message in every language; the x-lang header picks one, like a real API would. */
export type LocalizedText = Record<MockLanguage, string>

export type MessageParams = Record<string, string | number>

export function toMockLanguage(raw: unknown): MockLanguage {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .startsWith('en')
    ? 'en'
    : 'fr'
}

export function localize(language: MockLanguage, text: LocalizedText, params?: MessageParams) {
  return text[language].replace(/\{(\w+)\}/g, (match, name: string) =>
    params && name in params ? String(params[name]) : match
  )
}

export const COMMON_MESSAGES = {
  unknownReference: {
    fr: "La valeur choisie pour « {field} » n'existe pas.",
    en: 'The value chosen for "{field}" does not exist.'
  },
  notFound: { fr: 'Enregistrement introuvable.', en: 'Record not found.' },
  routeNotFound: { fr: 'Ressource inconnue : {path}', en: 'Unknown resource: {path}' },
  methodNotAllowed: {
    fr: 'Méthode {method} non prise en charge sur {path}.',
    en: 'Method {method} is not supported on {path}.'
  },
  unauthorized: {
    fr: 'Votre session a expiré. Reconnectez-vous.',
    en: 'Your session has expired. Please sign in again.'
  },
  forbidden: {
    fr: "Vous n'avez pas le droit d'effectuer cette action.",
    en: 'You are not allowed to perform this action.'
  },
  invalidBody: { fr: 'Le contenu de la requête est invalide.', en: 'The request body is invalid.' },
  invalidFilters: {
    fr: 'Les filtres de la liste sont invalides.',
    en: 'The list filters are invalid.'
  },
  requiredField: {
    fr: 'Le champ « {field} » est obligatoire.',
    en: 'The "{field}" field is required.'
  },
  storageFull: {
    fr: "L'espace de stockage du navigateur est plein : la modification n'a pas été enregistrée.",
    en: 'The browser storage is full: the change was not saved.'
  },
  unexpected: { fr: 'Une erreur inattendue est survenue.', en: 'An unexpected error occurred.' },
  yes: { fr: 'Oui', en: 'Yes' },
  no: { fr: 'Non', en: 'No' }
} satisfies Record<string, LocalizedText>

/** A calendar day (YYYY-MM-DD…) as the server writes it in messages: DD/MM/YYYY in both languages. */
export function localizeDay(isoDay: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDay)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : isoDay
}
