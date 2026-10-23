import type { LocalizedText } from '../i18n'

export const FLEET_OPTION_SETS: Record<string, Record<string, LocalizedText>> = {
  couplingRole: {
    tows: { fr: 'Tire une remorque', en: 'Tows a trailer' },
    towed: { fr: 'Est attelé à un tracteur', en: 'Is towed by a tractor' },
    none: { fr: "Ne s'attelle pas", en: 'Is not coupled' }
  },
  equipmentCapability: {
    tracker: { fr: 'Boîtier de suivi', en: 'Tracker' },
    camera: { fr: 'Caméra', en: 'Camera' },
    pump: { fr: 'Pompe', en: 'Pump' },
    safety: { fr: 'Sécurité', en: 'Safety' },
    other: { fr: 'Autre', en: 'Other' }
  },
  providerType: {
    garage: { fr: 'Atelier', en: 'Garage' },
    parts_supplier: { fr: 'Fournisseur de pièces', en: 'Parts supplier' },
    tyre_supplier: { fr: 'Fournisseur de pneus', en: 'Tyre supplier' },
    fuel_supplier: { fr: 'Fournisseur de carburant', en: 'Fuel supplier' },
    insurer: { fr: 'Assureur', en: 'Insurer' },
    manufacturer: { fr: 'Constructeur', en: 'Manufacturer' },
    bank: { fr: 'Banque', en: 'Bank' },
    carrier: { fr: 'Transporteur', en: 'Carrier' }
  },
  vehicleStatus: {
    available: { fr: 'Disponible', en: 'Available' },
    assigned: { fr: 'Affecté', en: 'Assigned' },
    in_mission: { fr: 'En trajet', en: 'On trip' },
    immobilized: { fr: 'Immobilisé', en: 'Immobilized' },
    out_of_service: { fr: 'Hors service', en: 'Out of service' },
    removed: { fr: 'Sorti du parc', en: 'Left the fleet' }
  },
  fuelType: {
    diesel: { fr: 'Gazole', en: 'Diesel' },
    petrol: { fr: 'Essence', en: 'Petrol' },
    electric: { fr: 'Électrique', en: 'Electric' },
    hybrid: { fr: 'Hybride', en: 'Hybrid' },
    lpg: { fr: 'GPL', en: 'LPG' }
  },
  acquisitionMode: {
    purchase: { fr: 'Achat', en: 'Purchase' },
    rental: { fr: 'Location', en: 'Rental' },
    leasing: { fr: 'Crédit-bail', en: 'Leasing' }
  },
  equipmentState: {
    operational: { fr: 'Opérationnel', en: 'Operational' },
    out_of_service: { fr: 'Hors service', en: 'Out of service' },
    uninstalled: { fr: 'Désinstallé', en: 'Uninstalled' }
  },
  periodState: {
    active: { fr: 'En cours', en: 'Running' },
    ended: { fr: 'Terminé', en: 'Ended' }
  },
  driverAvailability: {
    available: { fr: 'Disponible', en: 'Available' },
    on_trip: { fr: 'En trajet', en: 'On trip' },
    trip_planned: { fr: 'Trajet prévu', en: 'Trip planned' },
    on_leave: { fr: 'En congé', en: 'On leave' },
    unavailable: { fr: 'Indisponible', en: 'Unavailable' }
  },
  tripStatus: {
    planned: { fr: 'Prévu', en: 'Planned' },
    in_progress: { fr: 'En cours', en: 'On the road' },
    completed: { fr: 'Arrivé, à clôturer', en: 'Arrived, to close' },
    closed: { fr: 'Clôturé', en: 'Closed' },
    cancelled: { fr: 'Annulé', en: 'Cancelled' }
  },
  stopRole: {
    departure: { fr: 'Départ', en: 'Departure' },
    loading: { fr: 'Chargement', en: 'Loading' },
    rest: { fr: 'Repos', en: 'Rest' },
    check: { fr: 'Contrôle', en: 'Check' },
    delivery: { fr: 'Livraison', en: 'Delivery' },
    arrival: { fr: 'Arrivée', en: 'Arrival' }
  },
  fleetState: {
    AVAILABLE: { fr: 'Disponible, en attente de mission', en: 'Available, waiting for a mission' },
    TRIP_PLANNED: { fr: 'Départ prévu', en: 'Departure planned' },
    TO_LOADING: { fr: 'En route vers le chargement', en: 'Heading to loading' },
    TO_DELIVERY: { fr: 'En route vers la livraison', en: 'Heading to delivery' },
    RETURNING: { fr: 'En retour', en: 'Returning' },
    IMMOBILIZED: { fr: 'Immobilisé', en: 'Immobilized' }
  },
  fleetStateGroup: {
    operational: { fr: 'Opérationnel', en: 'Operational' },
    transit: { fr: 'En route', en: 'On the road' },
    immobilized: { fr: 'Immobilisé', en: 'Immobilized' }
  },
  documentTarget: {
    vehicle: { fr: 'Véhicule', en: 'Vehicle' },
    person: { fr: 'Personne', en: 'Person' },
    company: { fr: 'Entreprise', en: 'Company' }
  },
  personScope: {
    all: { fr: 'Tout le personnel', en: 'All staff' },
    drivers: { fr: 'Personnel roulant', en: 'Road staff' },
    office: { fr: 'Personnel sédentaire', en: 'Office staff' }
  },
  documentValidity: {
    limited: { fr: 'Limitée', en: 'Limited' },
    unlimited: { fr: 'Illimitée', en: 'Unlimited' }
  },
  documentState: {
    valid: { fr: 'Valide', en: 'Valid' },
    expiring: { fr: 'À renouveler', en: 'To renew' },
    expired: { fr: 'Expiré', en: 'Expired' },
    cancelled: { fr: 'Annulé', en: 'Cancelled' },
    lost: { fr: 'Perdu', en: 'Lost' }
  },
  companyDocumentStatus: {
    pending: { fr: 'À examiner', en: 'To review' },
    approved: { fr: 'Validé', en: 'Approved' },
    rejected: { fr: 'Refusé', en: 'Rejected' }
  },
  insuranceCoverage: {
    third_party: { fr: 'Responsabilité civile', en: 'Third party' },
    third_party_fire_theft: { fr: 'RC, incendie et vol', en: 'Third party, fire and theft' },
    comprehensive: { fr: 'Tous risques', en: 'Comprehensive' }
  },
  policyState: {
    upcoming: { fr: 'À venir', en: 'Upcoming' },
    active: { fr: 'En cours', en: 'Active' },
    expiring: { fr: 'À renouveler', en: 'To renew' },
    expired: { fr: 'Échue', en: 'Expired' },
    terminated: { fr: 'Résiliée', en: 'Terminated' }
  },
  claimNature: {
    accident: { fr: 'Accident', en: 'Accident' },
    incident: { fr: 'Incident', en: 'Incident' }
  },
  claimSeverity: {
    minor_damage: { fr: 'Dégâts matériels légers', en: 'Minor damage' },
    major_damage: { fr: 'Dégâts matériels lourds', en: 'Major damage' },
    bodily_injury: { fr: 'Dommages corporels', en: 'Bodily injury' },
    environmental: { fr: 'Atteinte à l’environnement', en: 'Environmental damage' }
  },
  claimLiability: {
    to_determine: { fr: 'À déterminer', en: 'To be determined' },
    company: { fr: 'Entreprise', en: 'Company' },
    third_party: { fr: 'Tiers', en: 'Third party' },
    shared: { fr: 'Partagée', en: 'Shared' }
  },
  claimInsuranceStatus: {
    not_declared: { fr: 'Non déclaré', en: 'Not reported' },
    declared: { fr: 'Déclaré', en: 'Reported' },
    assessment: { fr: 'Expertise', en: 'Assessment' },
    accepted: { fr: 'Accepté', en: 'Accepted' },
    refused: { fr: 'Refusé', en: 'Refused' },
    settled: { fr: 'Indemnisé', en: 'Settled' }
  },
  claimStatus: {
    open: { fr: 'Ouvert', en: 'Open' },
    closed: { fr: 'Clos', en: 'Closed' }
  },
  infractionSeverity: {
    minor: { fr: 'Mineure', en: 'Minor' },
    major: { fr: 'Majeure', en: 'Major' },
    serious: { fr: 'Grave', en: 'Serious' }
  },
  infractionSource: {
    manual: { fr: 'Saisie', en: 'Recorded' },
    telematics: { fr: 'Télématique', en: 'Telematics' }
  },
  infractionStatus: {
    new: { fr: 'Nouvelle', en: 'New' },
    in_progress: { fr: 'En traitement', en: 'In progress' },
    closed: { fr: 'Clôturée', en: 'Closed' }
  },
  infractionOutcome: {
    reminder: { fr: 'Rappel à l’ordre', en: 'Reminder' },
    warning: { fr: 'Avertissement écrit', en: 'Written warning' },
    training: { fr: 'Formation ciblée', en: 'Targeted training' },
    sanction: { fr: 'Sanction disciplinaire', en: 'Disciplinary sanction' },
    fine_paid: { fr: 'Amende payée par le conducteur', en: 'Fine paid by the driver' },
    dismissed: { fr: 'Infraction contestée et levée', en: 'Contested and dismissed' }
  },
  trainingReason: {
    score: { fr: 'Score de conduite', en: 'Driving score' },
    accident: { fr: 'Accident', en: 'Accident' },
    incident: { fr: 'Incident', en: 'Incident' },
    infraction: { fr: 'Infraction', en: 'Infraction' },
    other: { fr: 'Autre', en: 'Other' }
  },
  trainingStatus: {
    to_plan: { fr: 'À planifier', en: 'To plan' },
    planned: { fr: 'Planifiée', en: 'Planned' },
    attended: { fr: 'Suivie', en: 'Attended' },
    cancelled: { fr: 'Annulée', en: 'Cancelled' }
  },
  checkPointScope: {
    vehicle: { fr: 'Véhicule', en: 'Vehicle' },
    driver: { fr: 'Conducteur', en: 'Driver' }
  },
  checkResult: {
    ok: { fr: 'Conforme', en: 'OK' },
    anomaly: { fr: 'Anomalie', en: 'Anomaly' },
    na: { fr: 'Sans objet', en: 'Not applicable' }
  },
  checklistStage: {
    departure: { fr: 'Départ', en: 'Departure' },
    stop: { fr: 'Pause', en: 'Stop' },
    arrival: { fr: 'Arrivée', en: 'Arrival' }
  },
  inspectionResult: {
    conforming: { fr: 'Conforme', en: 'Conforming' },
    non_conforming: { fr: 'Non conforme', en: 'Non-conforming' }
  },
  inspectionState: {
    conforming: { fr: 'Conforme', en: 'Conforming' },
    recheck_pending: { fr: 'Contre-visite à passer', en: 'Re-inspection due' },
    recheck_overdue: { fr: 'Contre-visite en retard', en: 'Re-inspection overdue' },
    rechecked: { fr: 'Contre-visite passée', en: 'Re-inspected' }
  },
  departureDecision: {
    pending: { fr: 'En attente', en: 'Pending' },
    granted: { fr: 'Accordé', en: 'Granted' },
    refused: { fr: 'Refusé', en: 'Refused' }
  },
  departureCheck: {
    checklist: { fr: 'Check-list de départ', en: 'Departure checklist' },
    vehicle: { fr: 'Véhicule', en: 'Vehicle' },
    trailer: { fr: 'Remorque', en: 'Trailer' },
    vehicleDocuments: { fr: 'Documents du véhicule', en: 'Vehicle documents' },
    driver: { fr: 'Conducteur', en: 'Driver' },
    rest: { fr: 'Repos avant le départ', en: 'Rest before departure' },
    weeklyRest: { fr: 'Repos hebdomadaire', en: 'Weekly rest' },
    driverChecks: { fr: 'Contrôles du conducteur', en: 'Driver checks' }
  },
  deviationCategory: {
    route: { fr: 'Itinéraire', en: 'Route' },
    stop: { fr: 'Arrêt', en: 'Stop' },
    time: { fr: 'Temps de conduite', en: 'Driving time' }
  },
  deviationSeverity: {
    minor: { fr: 'Mineur', en: 'Minor' },
    major: { fr: 'Majeur', en: 'Major' },
    critical: { fr: 'Critique', en: 'Critical' }
  },
  deviationUnit: {
    min: { fr: 'min', en: 'min' },
    h: { fr: 'h', en: 'h' },
    m: { fr: 'm', en: 'm' },
    km: { fr: 'km', en: 'km' },
    percent: { fr: '%', en: '%' }
  },
  deviationNature: {
    to_qualify: { fr: 'À qualifier', en: 'To qualify' },
    authorized: { fr: 'Autorisé', en: 'Authorized' },
    endured: { fr: 'Subi', en: 'Endured' },
    unjustified: { fr: 'Non justifié', en: 'Unjustified' }
  },
  deviationDecision: {
    dismissed: { fr: 'Classé', en: 'Dismissed' },
    warning: { fr: 'Avertissement', en: 'Warning' },
    sanction: { fr: 'Sanction', en: 'Sanction' }
  },
  equipmentDueState: {
    ok: { fr: 'À jour', en: 'Up to date' },
    due_soon: { fr: 'Échéance proche', en: 'Due soon' },
    overdue: { fr: 'Échéance dépassée', en: 'Overdue' }
  },
  alertCategory: {
    document: { fr: 'Documents', en: 'Documents' },
    companyDocument: { fr: "Documents de l'entreprise", en: 'Company documents' },
    checklist: { fr: 'Check-list de départ', en: 'Departure checklist' },
    infraction: { fr: 'Infractions', en: 'Infractions' },
    training: { fr: 'Formations', en: 'Trainings' },
    departure: { fr: 'Départs', en: 'Departures' },
    equipment: { fr: 'Équipements', en: 'Equipment' },
    inspection: { fr: 'Contre-visites', en: 'Re-inspections' },
    deviation: { fr: "Écarts d'itinéraire", en: 'Route deviations' },
    insurance: { fr: 'Assurances', en: 'Insurance' }
  },
  alertSeverity: {
    info: { fr: 'Information', en: 'Information' },
    warning: { fr: 'Attention', en: 'Warning' },
    critical: { fr: 'Critique', en: 'Critical' }
  },
  alertStatus: {
    new: { fr: 'Nouvelle', en: 'New' },
    acknowledged: { fr: 'Prise en charge', en: 'Taken in charge' },
    handled: { fr: 'Traitée', en: 'Handled' },
    resolved: { fr: 'Résolue', en: 'Resolved' }
  },
  complianceGapReason: {
    missing: { fr: 'Manquant', en: 'Missing' },
    expired: { fr: 'Expiré', en: 'Expired' },
    cancelled: { fr: 'Annulé', en: 'Cancelled' },
    lost: { fr: 'Perdu', en: 'Lost' }
  }
}
