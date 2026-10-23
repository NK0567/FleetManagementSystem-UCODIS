import type { LocalizedText } from '../../i18n'

export const FLEET_MESSAGES = {
  motorizedCannotBeTowed: {
    fr: 'Un véhicule motorisé ne peut pas être attelé à un tracteur.',
    en: 'A motorized vehicle cannot be towed by a tractor.'
  },
  unpoweredCannotTow: {
    fr: 'Un véhicule sans moteur ne peut pas tirer une remorque.',
    en: 'An unpowered vehicle cannot tow a trailer.'
  },
  compartmentsNeedGoods: {
    fr: 'Seul un véhicule qui porte la marchandise peut être compartimenté.',
    en: 'Only a vehicle carrying goods can have compartments.'
  },
  siteTypeInUse: {
    fr: 'Des sites sont de ce type : il ne peut pas être supprimé.',
    en: 'Sites use this type: it cannot be deleted.'
  },
  duplicateSiteName: {
    fr: 'Un site porte déjà ce nom ({no}).',
    en: 'A site already has this name ({no}).'
  },
  siteUsedByStaff: {
    fr: 'Des employés sont rattachés à ce site : il ne peut pas être supprimé. Désactivez-le plutôt.',
    en: 'Employees belong to this site: it cannot be deleted. Deactivate it instead.'
  },
  siteUsedByOrgUnits: {
    fr: 'Des entités sont rattachées à ce site : il ne peut pas être supprimé. Désactivez-le plutôt.',
    en: 'Org units belong to this site: it cannot be deleted. Deactivate it instead.'
  },
  duplicateProvider: {
    fr: 'Un prestataire de ce type porte déjà ce nom ({no}).',
    en: 'A provider of this type already has this name ({no}).'
  },
  notAuthorizedReasonRequired: {
    fr: "Indiquez pourquoi le prestataire n'est plus autorisé.",
    en: 'Give the reason why the provider is no longer authorized.'
  },
  invalidContract: {
    fr: 'Le contrat n° {line} est incomplet ou incohérent : objet, début, fin après le début et montant positif.',
    en: 'Contract #{line} is incomplete or inconsistent: subject, start, end after the start and positive amount.'
  },
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
