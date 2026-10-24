import type { LocalizedText } from '../../i18n'

export const FLEET_MESSAGES = {
  documentTypeInUse: {
    fr: 'Des documents sont de ce type : il ne peut pas être supprimé. Désactivez-le plutôt.',
    en: 'Documents use this type: it cannot be deleted. Deactivate it instead.'
  },
  documentTypeNotApplicable: {
    fr: 'Ce type de document ne concerne pas ce titulaire.',
    en: 'This document type does not concern this holder.'
  },
  documentExpiryRequired: {
    fr: 'Ce document a une validité limitée : indiquez sa date de fin.',
    en: 'This document has a limited validity: give its end date.'
  },
  documentExpiryBeforeIssue: {
    fr: "La date de fin précède la date d'émission.",
    en: 'The end date is before the issue date.'
  },
  documentIssueInFuture: {
    fr: "La date d'émission ne peut pas être dans le futur.",
    en: 'The issue date cannot be in the future.'
  },
  documentReplaced: {
    fr: 'Une version plus récente remplace ce document : il ne se modifie plus.',
    en: 'A newer version replaces this document: it can no longer change.'
  },
  documentDeclared: {
    fr: 'Ce document est déclaré annulé ou perdu : renouvelez-le plutôt.',
    en: 'This document is declared cancelled or lost: renew it instead.'
  },
  tooManyPhotos: {
    fr: "Un véhicule garde au plus {max} photos : retirez-en une avant d'en ajouter.",
    en: 'A vehicle keeps at most {max} photos: remove one before adding another.'
  },
  observationTooLong: {
    fr: "L'observation dépasse 500 caractères.",
    en: 'The observation is longer than 500 characters.'
  },
  expectedBackInPast: {
    fr: 'La remise en service prévue ne peut pas être dans le passé.',
    en: 'The expected return to service cannot be in the past.'
  },
  inactiveRoute: {
    fr: "Cet itinéraire n'est plus proposé.",
    en: 'This route is no longer offered.'
  },
  invalidRoute: {
    fr: "Les arrêts de l'itinéraire sont incohérents : au moins deux arrêts, un départ en premier, un site par arrêt, des durées positives.",
    en: 'The stops of the route are inconsistent: at least two stops, a departure first, a site on each stop, positive durations.'
  },
  routeInUse: {
    fr: 'Des trajets suivent cet itinéraire : il ne peut pas être supprimé. Désactivez-le plutôt.',
    en: 'Trips follow this route: it cannot be deleted. Deactivate it instead.'
  },
  invalidDateTime: {
    fr: 'Indiquez une date et une heure valides.',
    en: 'Give a valid date and time.'
  },
  departureInPast: {
    fr: "Le départ prévu ne peut pas être avant aujourd'hui.",
    en: 'The planned departure cannot be before today.'
  },
  resourceBusy: {
    fr: '{name} est déjà pris sur un autre trajet à ce moment-là ({no}).',
    en: '{name} is already taken by another trip at that time ({no}).'
  },
  tripActionNotAllowed: {
    fr: "Cette action n'est pas possible pour un trajet dans cet état.",
    en: 'This action is not possible for a trip in this state.'
  },
  noStopToPass: {
    fr: "Il ne reste aucun arrêt intermédiaire à passer : terminez le trajet à l'arrivée.",
    en: 'No intermediate stop is left to pass: complete the trip on arrival.'
  },
  endOdometerBeforeStart: {
    fr: "Le kilométrage d'arrivée ne peut pas être inférieur à celui du départ ({km} km).",
    en: 'The arrival mileage cannot be lower than the departure one ({km} km).'
  },
  tripInProgress: {
    fr: 'Un trajet est en cours ({no}) : attendez son arrivée.',
    en: 'A trip is on the road ({no}): wait for its arrival.'
  },
  tripsStillOpen: {
    fr: 'Des trajets sont encore prévus ou en cours pour ce véhicule.',
    en: 'Trips are still planned or on the road for this vehicle.'
  },
  notATractor: {
    fr: "Ce véhicule ne tire pas de remorque : son type n'est pas un tracteur.",
    en: 'This vehicle does not tow: its type is not a tractor.'
  },
  notATrailer: {
    fr: "Ce véhicule ne s'attelle pas à un tracteur : son type n'est pas une remorque.",
    en: 'This vehicle is not towed: its type is not a trailer.'
  },
  vehicleNotUsable: {
    fr: "Le véhicule {plate} n'est pas utilisable : {reason}.",
    en: 'Vehicle {plate} cannot be used: {reason}.'
  },
  alreadyCoupled: {
    fr: "Le véhicule {plate} est déjà attelé ({no}) : dételez-le d'abord.",
    en: 'Vehicle {plate} is already coupled ({no}): uncouple it first.'
  },
  startBeforePreviousEnd: {
    fr: 'Le début ne peut pas précéder la fin de la période précédente ({date}).',
    en: 'The start cannot be before the end of the previous period ({date}).'
  },
  dateInFuture: {
    fr: 'La date ne peut pas être dans le futur.',
    en: 'The date cannot be in the future.'
  },
  endBeforeStart: {
    fr: 'La fin ne peut pas précéder le début ({date}).',
    en: 'The end cannot be before the start ({date}).'
  },
  periodAlreadyEnded: {
    fr: 'Cette période est déjà terminée.',
    en: 'This period has already ended.'
  },
  notMotorized: {
    fr: "Un conducteur s'affecte à un véhicule motorisé.",
    en: 'A driver is assigned to a motorized vehicle.'
  },
  vehicleAlreadyAssigned: {
    fr: "Le véhicule {plate} a déjà un conducteur ({name}) : terminez d'abord cette affectation.",
    en: 'Vehicle {plate} already has a driver ({name}): end that assignment first.'
  },
  driverAlreadyAssigned: {
    fr: "Ce conducteur conduit déjà le véhicule {plate} : terminez d'abord cette affectation.",
    en: 'This driver already drives vehicle {plate}: end that assignment first.'
  },
  driverNotEligible: {
    fr: 'Ce conducteur ne peut pas recevoir de véhicule : {reasons}.',
    en: 'This driver cannot be given a vehicle: {reasons}.'
  },
  vehicleStillLinked: {
    fr: "Le véhicule est encore attelé ou affecté : terminez d'abord ces liaisons.",
    en: 'The vehicle is still coupled or assigned: end these links first.'
  },
  reasonNotOnStaff: { fr: "n'est plus dans les effectifs", en: 'is no longer on staff' },
  reasonSuspended: { fr: 'est suspendu', en: 'is suspended' },
  reasonPositionDoesNotDrive: {
    fr: 'sa fonction ne comporte pas de conduite',
    en: 'their position involves no driving'
  },
  reasonNotAuthorized: { fr: "n'est pas habilité à conduire", en: 'is not authorized to drive' },
  reasonOnLeave: { fr: 'est en congé', en: 'is on leave' },
  reasonDocuments: {
    fr: 'ses documents obligatoires ne sont pas en règle',
    en: 'their mandatory documents are not valid'
  },
  duplicatePlate: {
    fr: "L'immatriculation {plate} est déjà portée, ou l'a été, par le véhicule {no}.",
    en: 'The plate {plate} is or was already used by vehicle {no}.'
  },
  duplicateVin: {
    fr: 'Ce numéro de châssis est déjà enregistré pour le véhicule {no}.',
    en: 'This chassis number is already registered for vehicle {no}.'
  },
  samePlate: {
    fr: "C'est déjà l'immatriculation du véhicule.",
    en: 'This is already the plate of the vehicle.'
  },
  inactiveVehicleType: {
    fr: "Ce type de véhicule n'est plus proposé.",
    en: 'This vehicle type is no longer offered.'
  },
  inactiveSite: {
    fr: "Ce site n'est plus actif.",
    en: 'This site is no longer active.'
  },
  compartmentsNotAllowed: {
    fr: "Ce type de véhicule n'a pas de compartiments.",
    en: 'This vehicle type has no compartments.'
  },
  compartmentsRequired: {
    fr: 'Un véhicule compartimenté a au moins un compartiment, chacun avec un volume positif.',
    en: 'A vehicle with compartments has at least one, each with a positive volume.'
  },
  odometerBackwards: {
    fr: 'Le kilométrage ne peut pas baisser : le dernier relevé est de {km} km.',
    en: 'The mileage cannot go down: the last reading is {km} km.'
  },
  vehicleRemoved: {
    fr: 'Ce véhicule est sorti du parc : sa fiche ne peut plus être modifiée.',
    en: 'This vehicle has left the fleet: its record can no longer be changed.'
  },
  alreadyOutOfService: {
    fr: 'Ce véhicule est déjà hors service.',
    en: 'This vehicle is already out of service.'
  },
  notOutOfService: {
    fr: "Ce véhicule n'est pas hors service.",
    en: 'This vehicle is not out of service.'
  },
  reasonRequired: {
    fr: 'Indiquez le motif.',
    en: 'Give the reason.'
  },
  removalDateInFuture: {
    fr: 'La date de sortie ne peut pas être dans le futur.',
    en: 'The removal date cannot be in the future.'
  },
  equipmentDueDateRequired: {
    fr: "Ce type d'équipement a une échéance : indiquez-la.",
    en: 'This equipment type has a due date: give it.'
  },
  duplicateSerial: {
    fr: 'Ce numéro de série est déjà installé sur le véhicule {no}.',
    en: 'This serial number is already installed on vehicle {no}.'
  },
  inactiveEquipmentType: {
    fr: "Ce type d'équipement n'est plus proposé.",
    en: 'This equipment type is no longer offered.'
  },
  vehicleTypeStructureFrozen: {
    fr: "{count} véhicules utilisent ce type : son rôle d'attelage, sa motorisation, le port de marchandise et les compartiments ne se modifient plus.",
    en: '{count} vehicles use this type: its coupling role, engine, goods and compartments can no longer change.'
  },
  vehicleTypeInUse: {
    fr: 'Des véhicules sont de ce type : il ne peut pas être supprimé.',
    en: 'Vehicles use this type: it cannot be deleted.'
  },
  equipmentTypeInUse: {
    fr: 'Des équipements de ce type sont enregistrés : il ne peut pas être supprimé.',
    en: 'Equipment of this type is recorded: it cannot be deleted.'
  },
  siteIsHomeBase: {
    fr: "Ce site est la base de {count} véhicules : changez d'abord leur base.",
    en: 'This site is the home site of {count} vehicles: change their home site first.'
  },
  causeRemoved: { fr: 'Sorti du parc le {date}', en: 'Left the fleet on {date}' },
  causeOutOfService: { fr: 'Hors service : {detail}', en: 'Out of service: {detail}' },
  causeDocument: { fr: 'Document hors validité : {detail}', en: 'Document not valid: {detail}' },
  causeInspection: {
    fr: 'Contre-visite en attente : {detail}',
    en: 'Re-inspection pending: {detail}'
  },
  causeMaintenance: { fr: 'En atelier : {detail}', en: 'In the workshop: {detail}' },
  causeTrip: { fr: 'En trajet ({detail})', en: 'On trip ({detail})' },
  causeDriver: { fr: 'Conducteur : {detail}', en: 'Driver: {detail}' },
  causeCoupling: { fr: 'Attelé à {detail}', en: 'Coupled with {detail}' },
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
  },
  companyDocumentFileRequired: {
    fr: 'Joignez le document scanné.',
    en: 'Attach the scanned document.'
  },
  companyDocumentDecided: {
    fr: 'Ce document a déjà été examiné : il ne se modifie plus.',
    en: 'This document has already been reviewed: it can no longer change.'
  },
  companyDocumentNotPending: {
    fr: 'Ce document a déjà été examiné.',
    en: 'This document has already been reviewed.'
  },
  companyDocumentOwnDecision: {
    fr: "Vous avez déposé ce document : une autre personne doit l'examiner.",
    en: 'You uploaded this document: someone else must review it.'
  },
  companyDocumentNotCurrent: {
    fr: "Seule la version en vigueur d'un document peut être remplacée, par un document du même type.",
    en: 'Only the current version of a document can be replaced, by a document of the same type.'
  },
  companyDocumentReplacementPending: {
    fr: 'Une nouvelle version de ce document attend déjà son examen.',
    en: 'A new version of this document is already awaiting review.'
  },
  rejectionReasonTooShort: {
    fr: 'Expliquez le refus en {min} caractères au moins.',
    en: 'Explain the rejection in at least {min} characters.'
  },
  insurerNotAuthorized: {
    fr: 'Choisissez un assureur agréé.',
    en: 'Choose an authorized insurer.'
  },
  policyNumberTaken: {
    fr: 'Cet assureur a déjà une police portant ce numéro.',
    en: 'This insurer already has a policy with this number.'
  },
  policyOverlap: {
    fr: 'Le véhicule est déjà couvert sur cette période par la police {no}.',
    en: 'The vehicle is already covered over this period by policy {no}.'
  },
  policyEndBeforeStart: {
    fr: "L'échéance précède le début de la police.",
    en: 'The end date is before the start of the policy.'
  },
  policyTerminationOutsidePeriod: {
    fr: 'La résiliation doit tomber pendant la période de la police.',
    en: 'The termination must fall within the policy period.'
  },
  policyTerminated: {
    fr: 'Cette police est résiliée : elle ne se modifie plus.',
    en: 'This policy is terminated: it can no longer change.'
  },
  policyHasClaims: {
    fr: 'Des sinistres renvoient à cette police : elle ne peut pas être supprimée.',
    en: 'Claims refer to this policy: it cannot be deleted.'
  },
  claimInFuture: {
    fr: 'La date du sinistre ne peut pas être dans le futur.',
    en: 'The date of the claim cannot be in the future.'
  },
  claimClosed: {
    fr: 'Ce dossier est clos : il ne se modifie plus.',
    en: 'This file is closed: it can no longer change.'
  },
  claimInsuranceStep: {
    fr: "Cette étape ne suit pas la précédente dans le traitement par l'assureur.",
    en: "This step does not follow the previous one in the insurer's handling."
  },
  claimNoPolicy: {
    fr: "Aucune police n'assure ce véhicule à la date du sinistre : il ne peut pas être déclaré à un assureur.",
    en: 'No policy covers this vehicle on the date of the claim: it cannot be reported to an insurer.'
  },
  claimIndemnityRequired: {
    fr: "Indiquez le montant de l'indemnité.",
    en: 'Give the amount of the indemnity.'
  },
  claimIndemnityAboveDamage: {
    fr: "L'indemnité ne peut pas dépasser le montant des dommages.",
    en: 'The indemnity cannot exceed the damage amount.'
  },
  claimClosureBlocked: {
    fr: 'Le dossier ne peut pas encore être clos : {reasons}.',
    en: 'The file cannot be closed yet: {reasons}.'
  },
  claimBlockAnalysis: {
    fr: "l'analyse des causes manque",
    en: 'the root cause analysis is missing'
  },
  claimBlockLiability: {
    fr: 'la responsabilité reste à déterminer',
    en: 'the liability is still to be determined'
  },
  claimBlockInsurance: {
    fr: "l'assureur n'a pas encore rendu sa décision",
    en: 'the insurer has not decided yet'
  },
  infractionTypeInUse: {
    fr: 'Des infractions sont de ce type : il ne peut pas être supprimé. Désactivez-le plutôt.',
    en: 'Infractions have this type: it cannot be deleted. Deactivate it instead.'
  },
  infractionTypeInactive: {
    fr: "Ce type d'infraction est désactivé.",
    en: 'This infraction type is inactive.'
  },
  infractionInFuture: {
    fr: "La date de l'infraction ne peut pas être dans le futur.",
    en: 'The date of the infraction cannot be in the future.'
  },
  infractionDuplicate: {
    fr: 'Cette infraction est déjà enregistrée ({no}).',
    en: 'This infraction is already recorded ({no}).'
  },
  infractionClosed: {
    fr: 'Cette infraction est clôturée : elle ne se modifie plus.',
    en: 'This infraction is closed: it can no longer change.'
  },
  infractionAlreadyTaken: {
    fr: 'Cette infraction est déjà prise en charge.',
    en: 'This infraction is already being handled.'
  },
  infractionOutcomeRequired: {
    fr: 'Choisissez la suite donnée et expliquez-la.',
    en: 'Choose the outcome and explain it.'
  },
  trainingNeedsDriver: {
    fr: "Indiquez d'abord le conducteur : la formation lui est destinée.",
    en: 'Give the driver first: the training is meant for them.'
  },
  trainingDuplicate: {
    fr: 'Une formation existe déjà pour {origin} et ce conducteur ({no}).',
    en: 'A training already exists for {origin} and this driver ({no}).'
  },
  trainingNotPending: {
    fr: 'Cette formation est suivie ou annulée : elle ne se modifie plus.',
    en: 'This training was attended or cancelled: it can no longer change.'
  },
  trainingNotPlanned: {
    fr: 'Planifiez la formation avant de la marquer comme suivie.',
    en: 'Plan the training before marking it as attended.'
  },
  trainingAttendedInFuture: {
    fr: 'Une formation ne peut pas être suivie à une date future.',
    en: 'A training cannot be attended on a future date.'
  },
  trainingPlannedInPast: {
    fr: 'La date prévue ne peut pas être passée.',
    en: 'The planned date cannot be in the past.'
  },
  notOnStaff: {
    fr: 'Cette personne ne fait plus partie du personnel.',
    en: 'This person is no longer on staff.'
  },
  checksIncomplete: {
    fr: 'Renseignez tous les points de contrôle.',
    en: 'Fill in every check point.'
  },
  checksCommentRequired: {
    fr: 'Expliquez chaque anomalie relevée.',
    en: 'Explain every anomaly found.'
  },
  checklistTripOver: {
    fr: 'Ce trajet est clôturé ou annulé : il ne reçoit plus de check-list.',
    en: 'This trip is closed or cancelled: it takes no more checklists.'
  },
  inspectionFindingsRequired: {
    fr: 'Décrivez les défauts relevés.',
    en: 'Describe the findings.'
  },
  inspectionNoRecheck: {
    fr: "Cette visite n'attend pas de contre-visite.",
    en: 'This inspection awaits no re-inspection.'
  },
  recheckDateInvalid: {
    fr: 'La contre-visite suit la visite et ne peut pas être future.',
    en: 'The re-inspection follows the inspection and cannot be in the future.'
  },
  checkChecklistMissing: {
    fr: 'Aucune check-list de départ pour ce trajet.',
    en: 'No departure checklist for this trip.'
  },
  checkChecklistBlocking: {
    fr: 'Anomalie bloquante : {points}.',
    en: 'Blocking anomaly: {points}.'
  },
  checkChecklistOk: {
    fr: 'Check-list {no}.',
    en: 'Checklist {no}.'
  },
  checkVehicleOk: {
    fr: '{plate} utilisable.',
    en: '{plate} is usable.'
  },
  checkVehicleKo: {
    fr: '{plate} : {reason}',
    en: '{plate}: {reason}'
  },
  checkNoTrailer: {
    fr: 'Sans remorque.',
    en: 'No trailer.'
  },
  checkDocumentsOk: {
    fr: 'Documents en règle.',
    en: 'Documents in order.'
  },
  checkDriverOk: {
    fr: '{name} peut conduire.',
    en: '{name} may drive.'
  },
  checkRestOk: {
    fr: '{hours} h de repos depuis le dernier trajet (minimum {min} h).',
    en: '{hours} h of rest since the last trip (at least {min} h).'
  },
  checkRestNone: {
    fr: 'Aucun trajet récent.',
    en: 'No recent trip.'
  },
  checkWeeklyRest: {
    fr: 'Plus long repos sur 7 jours : {hours} h (minimum {min} h).',
    en: 'Longest rest over 7 days: {hours} h (at least {min} h).'
  },
  checkDriverChecksOk: {
    fr: 'Contrôles du conducteur conformes.',
    en: 'Driver checks passed.'
  },
  checkDriverChecksBlocking: {
    fr: 'Contrôle bloquant en anomalie : {points}.',
    en: 'Blocking check failed: {points}.'
  },
  departureNotReady: {
    fr: 'Le départ ne peut pas être accordé : {checks}',
    en: 'The departure cannot be granted: {checks}'
  },
  departureAlreadyRequested: {
    fr: 'Une demande existe déjà pour ce trajet ({no}).',
    en: 'A request already exists for this trip ({no}).'
  },
  departureNotPending: {
    fr: 'Cette demande a déjà été décidée.',
    en: 'This request has already been decided.'
  },
  departureTripNotPlanned: {
    fr: 'Seul un trajet planifié peut demander son départ.',
    en: 'Only a planned trip can request its departure.'
  },
  tripNeedsAuthorization: {
    fr: "Le trajet n'a pas d'autorisation de départ accordée.",
    en: 'The trip has no granted departure authorization.'
  },
  deviationTypeInUse: {
    fr: 'Des écarts sont de ce type : il ne peut pas être supprimé. Désactivez-le plutôt.',
    en: 'Deviations have this type: it cannot be deleted. Deactivate it instead.'
  },
  deviationTypeInactive: {
    fr: "Ce type d'écart est désactivé.",
    en: 'This deviation type is inactive.'
  },
  deviationTripOver: {
    fr: "Ce trajet est clôturé ou annulé : il ne reçoit plus d'écart.",
    en: 'This trip is closed or cancelled: it takes no more deviations.'
  },
  deviationQualified: {
    fr: 'Cet écart est déjà qualifié : il ne se modifie plus.',
    en: 'This deviation is already qualified: it can no longer change.'
  },
  deviationJustified: {
    fr: 'Une justification est déjà enregistrée pour cet écart.',
    en: 'A justification is already recorded for this deviation.'
  },
  deviationJustificationLate: {
    fr: 'Le délai de justification de cet écart est dépassé.',
    en: 'The time to justify this deviation is over.'
  },
  deviationNatureRequired: {
    fr: "Choisissez la nature de l'écart.",
    en: 'Choose the nature of the deviation.'
  },
  deviationDecisionNotAllowed: {
    fr: 'Un écart autorisé ou subi ne peut être que classé.',
    en: 'An authorized or endured deviation can only be dismissed.'
  },
  tripDeviationsToQualify: {
    fr: 'Écarts encore à qualifier sur ce trajet : {count}.',
    en: 'Deviations still to qualify on this trip: {count}.'
  },
  alertAlreadyTaken: {
    fr: 'Cette alerte est déjà prise en charge.',
    en: 'This alert is already taken in charge.'
  },
  alertHandled: {
    fr: 'Cette alerte est déjà traitée.',
    en: 'This alert is already handled.'
  },
  refillDuplicate: {
    fr: 'Ce plein est déjà enregistré ({no}).',
    en: 'This refill is already recorded ({no}).'
  },
  refillQualified: {
    fr: 'Ce plein est qualifié : il ne se modifie plus.',
    en: 'This refill is qualified: it can no longer change.'
  },
  refillNotAnomaly: {
    fr: 'Seul un plein en anomalie se qualifie.',
    en: 'Only a refill with an anomaly can be qualified.'
  },
  fuelCauseInactive: {
    fr: "Cette cause n'est plus active.",
    en: 'This cause is no longer active.'
  },
  refillCheckTank: {
    fr: '{liters} L pour un réservoir de {capacity} L',
    en: '{liters} L for a {capacity} L tank'
  },
  refillCheckTankUnknown: {
    fr: 'Capacité du réservoir inconnue',
    en: 'Tank capacity unknown'
  },
  refillCheckOdometer: {
    fr: '{odometer} km, après {previous} km au plein précédent',
    en: '{odometer} km, after {previous} km at the previous refill'
  },
  refillCheckOdometerFirst: {
    fr: '{odometer} km, premier plein connu',
    en: '{odometer} km, first known refill'
  },
  refillCheckDriverOk: {
    fr: '{name}, affecté au véhicule ce jour-là',
    en: '{name}, assigned to the vehicle that day'
  },
  refillCheckDriverOther: {
    fr: "{name} n'était pas affecté au véhicule ce jour-là",
    en: '{name} was not assigned to the vehicle that day'
  },
  refillCheckDriverNone: {
    fr: 'Conducteur non renseigné',
    en: 'Driver not given'
  },
  refillCheckHours: {
    fr: 'Plein à {time}, plage autorisée de {start} h à {end} h',
    en: 'Refill at {time}, allowed from {start}:00 to {end}:00'
  },
  refillCheckGps: {
    fr: 'Véhicule à {gap} km de la station (au plus {max} km)',
    en: 'Vehicle {gap} km from the station (at most {max} km)'
  },
  refillCheckGpsNone: {
    fr: 'Position non relevée',
    en: 'Position not recorded'
  },
  gapNotToQualify: {
    fr: "Cet écart n'attend pas de qualification.",
    en: 'This gap awaits no qualification.'
  },
  gapNotQualified: {
    fr: "Qualifiez d'abord l'écart.",
    en: 'Qualify the gap first.'
  },
  gapNotProposed: {
    fr: "Aucune retenue n'attend de décision.",
    en: 'No deduction awaits a decision.'
  },
  gapOwnProposal: {
    fr: 'Vous avez proposé cette retenue : une autre personne doit la décider.',
    en: 'You proposed this deduction: someone else must decide it.'
  },
  gapDeductionCause: {
    fr: "La cause retenue n'est pas imputable au conducteur.",
    en: 'The cause is not chargeable to the driver.'
  },
  gapDeductionAboveExcess: {
    fr: 'La retenue dépasse le surcoût de la période.',
    en: 'The deduction exceeds the extra cost of the period.'
  },
  gapDeductionAboveCap: {
    fr: 'La retenue dépasse le plafond réglé.',
    en: 'The deduction exceeds the set cap.'
  },
  gapClosed: {
    fr: 'Cet écart est clos.',
    en: 'This gap is closed.'
  },
  cardNumberTaken: {
    fr: 'Une carte porte déjà ce numéro ({no}).',
    en: 'A card already has this number ({no}).'
  },
  cardSupplierInvalid: {
    fr: 'Choisissez un fournisseur de carburant agréé.',
    en: 'Choose an authorized fuel supplier.'
  },
  cardHolderRequired: {
    fr: 'Indiquez le véhicule ou le conducteur titulaire de la carte.',
    en: 'Give the vehicle or the driver holding the card.'
  },
  cardHolderHasCard: {
    fr: 'Ce titulaire a déjà une carte active chez ce fournisseur ({no}).',
    en: 'This holder already has an active card with this supplier ({no}).'
  },
  cardNotActive: {
    fr: 'Seule une carte active peut être bloquée.',
    en: 'Only an active card can be blocked.'
  },
  cardNotBlocked: {
    fr: "Cette carte n'est pas bloquée.",
    en: 'This card is not blocked.'
  },
  cardExpired: {
    fr: 'Cette carte est expirée : elle ne peut pas être débloquée.',
    en: 'This card has expired: it cannot be unblocked.'
  },
  transactionDuplicate: {
    fr: 'Cette transaction est déjà enregistrée ({no}).',
    en: 'This transaction is already recorded ({no}).'
  },
  transactionMatched: {
    fr: "Cette transaction est déjà rapprochée d'un plein.",
    en: 'This transaction is already matched with a refill.'
  },
  transactionNotMatched: {
    fr: "Cette transaction n'est rapprochée d'aucun plein.",
    en: 'This transaction is matched with no refill.'
  },
  transactionRefillInvalid: {
    fr: 'Ce plein ne correspond pas au titulaire de la carte, ou il est trop éloigné dans le temps.',
    en: 'This refill does not belong to the card holder, or it is too far apart in time.'
  },
  transactionRefillTaken: {
    fr: "Ce plein est déjà rapproché d'une autre transaction.",
    en: 'This refill is already matched with another transaction.'
  },
  cardNoVehicle: {
    fr: "Aucun véhicule n'est rattaché à ce titulaire ce jour-là.",
    en: 'No vehicle is tied to this holder on that day.'
  },
  overrunExpired: {
    fr: 'Carte expirée à cette date',
    en: 'Card expired on that date'
  },
  overrunBlocked: {
    fr: 'Carte bloquée à cette date',
    en: 'Card blocked on that date'
  },
  overrunZone: {
    fr: "{city} n'est pas une ville autorisée",
    en: '{city} is not an allowed city'
  },
  overrunHours: {
    fr: 'Transaction à {hour} h, hors de la plage de {start} h à {end} h',
    en: 'Transaction at {hour}:00, outside {start}:00 to {end}:00'
  },
  overrunDailyCount: {
    fr: 'Au-delà de {max} transactions par jour',
    en: 'Beyond {max} transactions a day'
  },
  overrunMonthlyAmount: {
    fr: 'Plafond mensuel en montant dépassé',
    en: 'Monthly amount cap exceeded'
  },
  overrunMonthlyVolume: {
    fr: 'Plafond mensuel en volume dépassé',
    en: 'Monthly volume cap exceeded'
  },
  telematicsEventTypeInUse: {
    fr: 'Ce type est utilisé par des événements : désactivez-le plutôt.',
    en: 'Events use this type: deactivate it instead.'
  },
  telematicsEventTypeInactive: {
    fr: "Ce type d'événement est désactivé.",
    en: 'This event type is inactive.'
  },
  telematicsBelowThreshold: {
    fr: "La mesure est sous le seuil du type ({threshold}) : ce n'est pas un événement.",
    en: 'The reading is below the threshold of the type ({threshold}): it is not an event.'
  },
  telematicsDuplicate: {
    fr: 'Cet événement a déjà été reçu pour ce véhicule ({no}).',
    en: 'This event was already received for this vehicle ({no}).'
  },
  telematicsEventHandled: {
    fr: 'Cet événement a déjà été traité.',
    en: 'This event was already handled.'
  },
  telematicsNoInfractionType: {
    fr: "Ce type d'événement ne correspond à aucun type d'infraction.",
    en: 'This event type matches no infraction type.'
  },
  positionUnknown: {
    fr: 'Position non transmise',
    en: 'Position not reported'
  },
  scoreAboveThreshold: {
    fr: "Le score du conducteur ({score}) n'est pas sous le seuil de formation ({threshold}).",
    en: "The driver's score ({score}) is not below the training threshold ({threshold})."
  },
  scoreTrainingPending: {
    fr: 'Une formation liée au score est déjà prévue pour ce conducteur ({no}).',
    en: 'A score training is already pending for this driver ({no}).'
  },
  scoreTrainingTopic: {
    fr: 'Score de conduite de {score}/100, sous le seuil de {threshold}',
    en: 'Driving score of {score}/100, below the threshold of {threshold}'
  },
  scoreAlertDetail: {
    fr: 'Score de {score}/100, seuil {threshold}',
    en: 'Score {score}/100, threshold {threshold}'
  },
  reportPeriodInvalid: {
    fr: 'La période du rapport est invalide : indiquez deux dates, la première avant la seconde.',
    en: 'The report period is invalid: give two dates, the first one before the second.'
  }
} satisfies Record<string, LocalizedText>
