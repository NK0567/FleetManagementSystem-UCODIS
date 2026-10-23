import type { LocalizedText } from '../../i18n'

export const FLEET_MESSAGES = {
  unknownSettingsSection: {
    fr: "Cette section de réglages n'existe pas.",
    en: 'This settings section does not exist.'
  },
  settingRequired: {
    fr: 'Le réglage « {field} » est obligatoire.',
    en: 'The "{field}" setting is required.'
  },
  settingOutOfRange: {
    fr: 'Le réglage « {field} » doit être compris entre {min} et {max}.',
    en: 'The "{field}" setting must be between {min} and {max}.'
  },
  settingInvalidTime: {
    fr: "Le réglage « {field} » n'est pas une heure valide (HH:MM).",
    en: 'The "{field}" setting is not a valid time (HH:MM).'
  },
  nightWindowIncomplete: {
    fr: "Indiquez l'heure de début et l'heure de fin de la conduite de nuit interdite, ou laissez les deux vides.",
    en: 'Give both the start and the end of the night driving ban, or leave both empty.'
  },
  nightWindowEmpty: {
    fr: "L'heure de fin de la conduite de nuit interdite doit différer de l'heure de début.",
    en: 'The end of the night driving ban must differ from its start.'
  }
} satisfies Record<string, LocalizedText>
