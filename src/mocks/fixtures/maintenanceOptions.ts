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
    planned: { fr: 'Travail planifié', en: 'Job planned' },
    handed_over: { fr: 'Confié à un atelier externe', en: 'Handed to an outside garage' },
    external_update: { fr: 'Suivi du garage', en: 'Garage follow-up' },
    returned: { fr: 'Retour du garage', en: 'Back from the garage' },
    completed: { fr: 'Fin des travaux déclarée', en: 'Work declared finished' },
    refused: { fr: 'Fin refusée', en: 'Finish refused' },
    validated: { fr: 'Ordre validé', en: 'Order validated' },
    cancelled: { fr: 'Ordre annulé', en: 'Order cancelled' }
  },
  serviceDueStatus: {
    unknown: { fr: 'À renseigner', en: 'To fill in' },
    upcoming: { fr: 'À venir', en: 'Upcoming' },
    due_soon: { fr: 'Proche', en: 'Due soon' },
    overdue: { fr: 'Dépassée', en: 'Overdue' },
    blocking: { fr: 'Bloquante', en: 'Blocking' }
  },
  operationNature: {
    check: { fr: 'Vérifier', en: 'Check' },
    lubricate: { fr: 'Lubrifier', en: 'Lubricate' },
    replace: { fr: 'Remplacer', en: 'Replace' }
  },
  stockStatus: {
    available: { fr: 'Disponible', en: 'Available' },
    low: { fr: 'Stock bas', en: 'Low stock' },
    out: { fr: 'Épuisé', en: 'Out of stock' }
  },
  stockMovementKind: {
    in: { fr: 'Entrée', en: 'In' },
    out: { fr: 'Sortie', en: 'Out' },
    adjustment: { fr: 'Ajustement', en: 'Adjustment' }
  },
  purchaseRequestStatus: {
    requested: { fr: 'Demandée', en: 'Requested' },
    ordered: { fr: 'Commandée', en: 'Ordered' },
    received: { fr: 'Reçue', en: 'Received' },
    cancelled: { fr: 'Annulée', en: 'Cancelled' }
  },
  vehicleCheckMoment: {
    before_loading: { fr: 'Avant le chargement', en: 'Before loading' },
    trip_return: { fr: 'Au retour de voyage', en: 'On trip return' },
    new_vehicle: { fr: "À la réception d'un camion neuf", en: 'On new vehicle delivery' }
  },
  checkResult: {
    ok: { fr: 'Conforme', en: 'OK' },
    anomaly: { fr: 'Anomalie', en: 'Anomaly' }
  },
  vehicleCheckOutcome: {
    ok: { fr: 'Conforme', en: 'OK' },
    anomaly: { fr: 'Anomalie à suivre', en: 'Anomaly to follow' },
    blocking: { fr: 'Anomalie bloquante', en: 'Blocking anomaly' }
  },
  mobileInterventionStatus: {
    en_route: { fr: 'En route', en: 'En route' },
    on_site: { fr: 'Sur place', en: 'On site' },
    resolved: { fr: 'Résolue', en: 'Resolved' },
    unresolved: { fr: 'Non résolue', en: 'Unresolved' }
  },
  tyreStatus: {
    stock: { fr: 'En stock', en: 'In stock' },
    mounted: { fr: 'Monté', en: 'Mounted' },
    retreading: { fr: 'En rechapage', en: 'At the retreader' },
    scrapped: { fr: 'Au rebut', en: 'Scrapped' }
  },
  tyreAlert: {
    none: { fr: 'Aucune', en: 'None' },
    safety: { fr: 'Sécurité', en: 'Safety' },
    rotation: { fr: 'Rotation due', en: 'Rotation due' }
  },
  tyreEvent: {
    purchased: { fr: 'Achat', en: 'Purchase' },
    mounted: { fr: 'Montage', en: 'Mounted' },
    dismounted: { fr: 'Démontage', en: 'Dismounted' },
    reading: { fr: 'Relevé', en: 'Reading' },
    rotated: { fr: 'Rotation', en: 'Rotation' },
    sent_retreading: { fr: 'Envoi au rechapage', en: 'Sent for retreading' },
    back_retreading: { fr: 'Retour du rechapage', en: 'Back from retreading' },
    scrapped: { fr: 'Mise au rebut', en: 'Scrapped' }
  },
  tyreSafetyIssue: {
    pressure: { fr: 'Pression sous le seuil', en: 'Pressure under the threshold' },
    tread: { fr: 'Sculpture sous le seuil', en: 'Tread under the threshold' }
  }
}
