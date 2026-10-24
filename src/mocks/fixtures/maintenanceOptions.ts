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
  }
}
