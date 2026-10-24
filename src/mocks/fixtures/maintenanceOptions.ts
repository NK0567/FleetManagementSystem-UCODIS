import type { LocalizedText } from '../i18n'

export const MAINTENANCE_OPTION_SETS: Record<string, Record<string, LocalizedText>> = {
  failureCodeKind: {
    system: { fr: 'Système', en: 'System' },
    subsystem: { fr: 'Sous-système', en: 'Subsystem' },
    mode: { fr: 'Mode de défaillance', en: 'Failure mode' },
    cause: { fr: 'Cause racine', en: 'Root cause' }
  },
  downtimeFamily: {
    technical: { fr: 'Technique', en: 'Technical' },
    regulatory: { fr: 'Réglementaire', en: 'Regulatory' },
    administrative: { fr: 'Administrative', en: 'Administrative' },
    human: { fr: 'Humaine', en: 'Human' }
  },
  downtimeRole: {
    breakdown: { fr: 'Panne', en: 'Breakdown' },
    preventive: { fr: 'Entretien préventif', en: 'Preventive service' },
    accident: { fr: 'Accident', en: 'Accident' }
  },
  downtimeStatus: {
    open: { fr: 'En cours', en: 'Open' },
    closed: { fr: 'Terminée', en: 'Ended' }
  },
  downtimeOrigin: {
    manual: { fr: 'Déclarée', en: 'Declared' },
    work_order: { fr: 'Ordre de travail', en: 'Work order' }
  }
}
