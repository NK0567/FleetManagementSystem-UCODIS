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
  },
  maintenanceType: {
    corrective: { fr: 'Correctif', en: 'Corrective' },
    preventive: { fr: 'Préventif', en: 'Preventive' },
    improvement: { fr: 'Amélioratif', en: 'Improvement' }
  },
  workOrderSeverity: {
    minor: { fr: 'Mineure', en: 'Minor' },
    major: { fr: 'Majeure', en: 'Major' },
    critical: { fr: 'Critique', en: 'Critical' }
  },
  workOrderOrigin: {
    driver_report: { fr: 'Signalement conducteur', en: 'Driver report' },
    workshop_finding: { fr: "Constat d'atelier", en: 'Workshop finding' },
    vehicle_check: { fr: 'Contrôle véhicule', en: 'Vehicle check' },
    road_checklist: { fr: 'Check-list de départ', en: 'Departure checklist' },
    inspection: { fr: 'Visite technique', en: 'Inspection' },
    preventive: { fr: 'Entretien planifié', en: 'Planned service' },
    mobile_team: { fr: 'Équipe mobile', en: 'Mobile team' },
    telematics: { fr: 'Télématique', en: 'Telematics' },
    claim: { fr: 'Sinistre', en: 'Claim' },
    history: { fr: 'Historique importé', en: 'Imported history' }
  },
  workOrderStatus: {
    open: { fr: 'Déclaré', en: 'Reported' },
    diagnosed: { fr: 'Diagnostiqué', en: 'Diagnosed' },
    in_progress: { fr: 'En cours', en: 'In progress' },
    awaiting_validation: { fr: 'À valider', en: 'To validate' },
    closed: { fr: 'Clôturé', en: 'Closed' },
    cancelled: { fr: 'Annulé', en: 'Cancelled' }
  },
  workOrderEvent: {
    declared: { fr: 'Panne déclarée', en: 'Fault reported' },
    diagnosed: { fr: 'Diagnostic posé', en: 'Diagnosis made' },
    started: { fr: 'Travaux commencés', en: 'Work started' },
    labour: { fr: 'Temps pointé', en: 'Time logged' },
    handed_over: { fr: 'Confié à un atelier externe', en: 'Handed to an outside garage' },
    external_update: { fr: 'Suivi du garage', en: 'Garage follow-up' },
    returned: { fr: 'Retour du garage', en: 'Back from the garage' },
    completed: { fr: 'Fin des travaux déclarée', en: 'Work declared finished' },
    refused: { fr: 'Fin refusée', en: 'Finish refused' },
    validated: { fr: 'Ordre validé', en: 'Order validated' },
    cancelled: { fr: 'Ordre annulé', en: 'Order cancelled' }
  }
}
