import type { LocalizedText } from '../../i18n'

export const FLEET_MESSAGES = {
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
  }
} satisfies Record<string, LocalizedText>
