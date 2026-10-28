import type { LocalizedText } from '../../i18n'

export const MAINTENANCE_MESSAGES = {
  unknownSettingsSection: {
    fr: 'Cette section de réglages n’existe pas.',
    en: 'This settings section does not exist.'
  },
  competenceInUse: {
    fr: 'Des techniciens ou des sous-systèmes utilisent cette compétence : désactivez-la plutôt.',
    en: 'Technicians or subsystems use this skill: deactivate it instead.'
  },
  technicianSkillRequired: {
    fr: 'Un technicien détient au moins une compétence.',
    en: 'A technician holds at least one skill.'
  },
  technicianSkillUnknown: {
    fr: 'La compétence « {code} » n’existe pas.',
    en: 'The "{code}" skill does not exist.'
  },
  technicianNotOnStaff: {
    fr: 'Seul un employé en poste peut être technicien.',
    en: 'Only an employee on staff can be a technician.'
  },
  failureCodeOnlySubsystemLinks: {
    fr: 'Seul un sous-système est rattaché à un système et à une compétence.',
    en: 'Only a subsystem belongs to a system and calls for a skill.'
  },
  failureSubsystemNeedsSystem: {
    fr: 'Un sous-système est rattaché à un système existant.',
    en: 'A subsystem belongs to an existing system.'
  },
  failureSubsystemNeedsSkill: {
    fr: 'Indiquez la compétence nécessaire pour réparer ce sous-système.',
    en: 'Give the skill needed to repair this subsystem.'
  },
  failureSystemHasSubsystems: {
    fr: 'Ce système regroupe des sous-systèmes : désactivez-le plutôt.',
    en: 'This system groups subsystems: deactivate it instead.'
  },
  downtimeRoleTaken: {
    fr: 'La cause {no} porte déjà ce rôle automatique.',
    en: 'The {no} cause already holds this automatic role.'
  },
  downtimeCodeHasRole: {
    fr: 'Cette cause porte un rôle automatique : retirez le rôle avant de la supprimer.',
    en: 'This cause holds an automatic role: remove the role before deleting it.'
  },
  downtimeCodeInactive: {
    fr: 'Cette cause est désactivée.',
    en: 'This cause is inactive.'
  },
  vehicleRemoved: {
    fr: 'Ce véhicule est sorti du parc.',
    en: 'This vehicle has left the fleet.'
  },
  dateInFuture: {
    fr: 'La date ne peut pas être dans le futur.',
    en: 'The date cannot be in the future.'
  },
  downtimeAlreadyOpen: {
    fr: 'Le véhicule est déjà indisponible pour cette cause ({no}).',
    en: 'The vehicle is already out for this cause ({no}).'
  },
  downtimeAlreadyEnded: {
    fr: 'Cette indisponibilité est déjà terminée.',
    en: 'This downtime has already ended.'
  },
  downtimeHeldByWorkOrder: {
    fr: 'Un ordre de travail porte cette indisponibilité : elle se termine avec lui.',
    en: 'A work order holds this downtime: it ends with the order.'
  },
  downtimeEndInvalid: {
    fr: 'La fin doit suivre le début et ne pas être dans le futur.',
    en: 'The end must follow the start and not be in the future.'
  },
  downtimeRoleMissing: {
    fr: "Aucune cause d'indisponibilité ne porte le rôle automatique nécessaire : complétez les causes dans les réglages.",
    en: 'No downtime cause holds the automatic role needed: complete the causes in the settings.'
  },
  symptomTooShort: {
    fr: 'Décrivez le symptôme en {min} caractères au moins.',
    en: 'Describe the symptom in at least {min} characters.'
  },
  workOrderOriginNotManual: {
    fr: "Une panne déclarée à la main vient d'un conducteur ou d'un constat d'atelier.",
    en: 'A fault reported by hand comes from a driver or a workshop finding.'
  },
  workOrderNotWorkable: {
    fr: "Cet ordre de travail n'accepte plus de travaux : il est terminé, validé ou annulé.",
    en: 'This work order takes no more work: it is finished, validated or cancelled.'
  },
  workOrderNotEditable: {
    fr: 'Le symptôme et la gravité ne se modifient plus une fois les travaux commencés.',
    en: 'The symptom and the severity can no longer change once the work has started.'
  },
  diagnosisCodeKind: {
    fr: "Le code « {field} » n'est pas de la bonne nature.",
    en: 'The "{field}" code is not of the right kind.'
  },
  diagnosisIncomplete: {
    fr: 'Diagnostic incomplet : {fields}.',
    en: 'Incomplete diagnosis: {fields}.'
  },
  workOrderAlreadyStarted: {
    fr: 'Les travaux ont déjà commencé.',
    en: 'The work has already started.'
  },
  technicianInactive: {
    fr: "Ce technicien n'est plus actif.",
    en: 'This technician is no longer active.'
  },
  labourDateInvalid: {
    fr: "Le pointage se fait entre la déclaration de la panne et aujourd'hui.",
    en: 'Time is logged between the fault report and today.'
  },
  labourDayFull: {
    fr: 'Ce technicien a déjà {logged} h ce jour-là ; une journée compte {max} h au plus.',
    en: 'This technician already has {logged} h that day; a day holds {max} h at most.'
  },
  diagnosisMissing: {
    fr: 'Posez le diagnostic avant de déclarer la fin des travaux.',
    en: 'Make the diagnosis before declaring the work finished.'
  },
  labourMissing: {
    fr: 'Pointez le temps passé avant de déclarer la fin des travaux.',
    en: 'Log the time spent before declaring the work finished.'
  },
  workDoneTooShort: {
    fr: 'Décrivez les travaux réalisés en {min} caractères au moins.',
    en: 'Describe the work done in at least {min} characters.'
  },
  odometerBackwards: {
    fr: "Le kilométrage ne peut pas être inférieur à celui de l'ouverture ({km} km).",
    en: 'The odometer cannot be below the one at opening ({km} km).'
  },
  workOrderNotAwaitingValidation: {
    fr: "Cet ordre de travail n'attend pas de validation.",
    en: 'This work order is not awaiting validation.'
  },
  fourEyes: {
    fr: 'La validation revient à une autre personne que celle qui a déclaré la fin ou fait les travaux.',
    en: 'Validation falls to someone other than whoever declared the work finished or did it.'
  },
  reasonTooShort: {
    fr: 'Donnez un motif de {min} caractères au moins.',
    en: 'Give a reason of at least {min} characters.'
  },
  workOrderFinished: {
    fr: 'Cet ordre de travail est déjà validé ou annulé.',
    en: 'This work order is already validated or cancelled.'
  },
  workOrderExternal: {
    fr: 'Cet ordre est confié à un atelier externe : le temps et la fin se suivent par le garage.',
    en: 'This order is with an outside garage: its time and finish go through the garage.'
  },
  workOrderNotAtWorkshop: {
    fr: "Ce véhicule n'est pas chez un atelier externe.",
    en: 'This vehicle is not at an outside garage.'
  },
  workOrderAlreadyExternal: {
    fr: 'Cet ordre a déjà été confié à un atelier externe.',
    en: 'This order has already been handed to an outside garage.'
  },
  garageNotAuthorized: {
    fr: "« {name} » n'est pas un garage autorisé.",
    en: '"{name}" is not an authorized garage.'
  },
  handOverDateInvalid: {
    fr: 'La remise se fait entre la déclaration de la panne et maintenant.',
    en: 'The hand-over falls between the fault report and now.'
  },
  expectedReturnBeforeHandOver: {
    fr: 'Le retour prévu ne peut pas précéder la remise du véhicule.',
    en: 'The expected return cannot come before the hand-over.'
  },
  returnDateInvalid: {
    fr: 'Le retour se fait entre la remise du véhicule et maintenant.',
    en: 'The return falls between the hand-over and now.'
  },
  invalidOperation: {
    fr: 'Opération {line} incomplète : libellé, sous-système et au moins un intervalle positif.',
    en: 'Operation {line} is incomplete: a label, a subsystem and at least one positive interval.'
  },
  vehicleHasPlan: {
    fr: 'Le véhicule {plate} suit déjà le plan « {plan} ».',
    en: 'Vehicle {plate} already follows the "{plan}" plan.'
  },
  planHasVehicles: {
    fr: 'Retirez les véhicules du plan avant de le supprimer.',
    en: 'Remove the vehicles from the plan before deleting it.'
  },
  operationNotInPlan: {
    fr: 'Cette opération ne fait pas partie du plan actif du véhicule.',
    en: "This operation is not part of the vehicle's active plan."
  },
  passageBeyondOdometer: {
    fr: 'Le kilométrage du passage dépasse le compteur du véhicule ({km} km).',
    en: "The passage odometer is beyond the vehicle's ({km} km)."
  },
  serviceOrderOpen: {
    fr: "L'ordre {no} couvre déjà l'entretien de ce véhicule.",
    en: "Order {no} already covers this vehicle's service."
  },
  nothingDue: {
    fr: "Aucune opération de ce véhicule n'arrive à échéance.",
    en: 'No operation of this vehicle is due.'
  },
  stockInsufficient: {
    fr: 'Stock insuffisant : {available} disponible.',
    en: 'Not enough stock: {available} available.'
  },
  adjustmentInvalid: {
    fr: "L'ajustement est un nombre entier non nul de pièces.",
    en: 'An adjustment is a non-zero whole number of parts.'
  },
  partsPending: {
    fr: 'Des pièces achetées pour cet ordre ne sont pas encore reçues.',
    en: 'Parts bought for this order have not been received yet.'
  },
  stockItemInactive: {
    fr: "Cet article n'est plus actif.",
    en: 'This item is no longer active.'
  },
  purchaseRequestWrongStatus: {
    fr: "Cette demande d'achat n'en est pas à cette étape.",
    en: 'This purchase request is not at this step.'
  },
  purchaseLabelMissing: {
    fr: 'Choisissez un article ou décrivez la pièce.',
    en: 'Pick an item or describe the part.'
  },
  supplierNotAuthorized: {
    fr: "« {name} » n'est pas un fournisseur de pièces autorisé.",
    en: '"{name}" is not an authorized parts supplier.'
  },
  planDateInPast: {
    fr: 'La date prévue ne peut pas être passée.',
    en: 'The planned date cannot be in the past.'
  },
  planTechnicianMissing: {
    fr: 'Choisissez au moins un technicien.',
    en: 'Pick at least one technician.'
  },
  technicianNotCompetent: {
    fr: "Ce technicien n'a pas la compétence « {competence} » demandée par ce travail.",
    en: 'This technician lacks the "{competence}" competence this job needs.'
  },
  noCheckPoint: {
    fr: 'Aucun point de contrôle actif pour ce moment.',
    en: 'No active check point for this moment.'
  },
  checkPointsMissing: {
    fr: 'Renseignez tous les points : {points}.',
    en: 'Answer every point: {points}.'
  },
  checkAnomalySymptom: {
    fr: 'Contrôle véhicule : {points} en anomalie.',
    en: 'Vehicle check: {points} failed.'
  },
  missionTypeInactive: {
    fr: "Ce type de mission n'est plus actif.",
    en: 'This mission type is no longer active.'
  },
  interventionInProgress: {
    fr: 'Une intervention est déjà en cours sur ce véhicule ({no}).',
    en: 'An intervention is already under way on this vehicle ({no}).'
  },
  crewMissing: {
    fr: "Choisissez au moins un technicien pour l'équipe.",
    en: 'Pick at least one technician for the crew.'
  },
  interventionClosed: {
    fr: 'Cette intervention est clôturée.',
    en: 'This intervention is closed.'
  },
  interventionUseActions: {
    fr: 'Une intervention avance par ses actions : arrivée, contrôles, clôture.',
    en: 'An intervention moves through its actions: arrival, checks, closing.'
  },
  arrivalInvalid: {
    fr: "L'arrivée se situe entre le départ et maintenant.",
    en: 'The arrival falls between the departure and now.'
  },
  arrivalMissing: {
    fr: "Indiquez l'heure d'arrivée avant de clôturer.",
    en: 'Record the arrival before closing.'
  },
  notAControlMission: {
    fr: 'Seule une mission de contrôle compte des contrôles.',
    en: 'Only a control mission counts checks.'
  },
  checkCountsInvalid: {
    fr: 'Les contrôles et les cas positifs sont des nombres entiers, les positifs au plus égaux aux contrôles.',
    en: 'Checks and positives are whole numbers, positives at most the checks.'
  },
  observationTooShort: {
    fr: 'Décrivez ce qui reste à faire ({min} caractères au moins).',
    en: 'Describe what is left to do ({min} characters at least).'
  },
  layoutInvalid: {
    fr: 'Un plan a au moins un essieu nommé et de 0 à 4 roues de secours.',
    en: 'A layout has at least one named axle and 0 to 4 spare wheels.'
  },
  layoutPositionInUse: {
    fr: "La position {position} porte un pneu monté : elle ne peut ni disparaître ni changer d'essieu.",
    en: 'Position {position} carries a mounted tyre: it can neither disappear nor change axle.'
  },
  tyreWrongStatus: {
    fr: "Ce pneu n'est pas dans la situation voulue pour cette action.",
    en: 'This tyre is not in the right state for this action.'
  },
  tyreSerialTaken: {
    fr: 'Ce numéro de série est déjà celui du pneu {no}.',
    en: 'This serial number already belongs to tyre {no}.'
  },
  dotInvalid: {
    fr: 'Le code DOT tient en quatre chiffres : semaine (01 à 53) puis année.',
    en: 'The DOT code is four digits: week (01 to 53) then year.'
  },
  tyreSupplierInvalid: {
    fr: 'Choisissez un fournisseur de pneus.',
    en: 'Pick a tyre supplier.'
  },
  tyreVehicleUnavailable: {
    fr: 'On ne monte pas de pneu sur un véhicule sorti ou hors service.',
    en: 'A tyre cannot be mounted on a vehicle that has left or is out of service.'
  },
  tyrePositionUnknown: {
    fr: "Cette position n'existe pas dans le plan de pneus du véhicule.",
    en: "This position is not in the vehicle's tyre layout."
  },
  tyrePositionTaken: {
    fr: 'Cette position porte déjà le pneu {no}.',
    en: 'This position already carries tyre {no}.'
  },
  tyreSamePosition: {
    fr: 'Choisissez une autre position.',
    en: 'Pick another position.'
  },
  sourceHasOrder: {
    fr: 'Un ordre de travail ({no}) a déjà été ouvert pour cet enregistrement.',
    en: 'A work order ({no}) has already been opened for this record.'
  },
  sourceClosed: {
    fr: 'Ce dossier est clôturé.',
    en: 'This file is closed.'
  },
  sourceNothingToRepair: {
    fr: 'Cet enregistrement ne relève aucun défaut à réparer.',
    en: 'This record shows no fault to repair.'
  },
  sourceClaimSymptom: {
    fr: 'Réparation du sinistre {no} : {circumstances}',
    en: 'Repair of claim {no}: {circumstances}'
  },
  sourceChecklistSymptom: {
    fr: 'Check-list de route : {points} en anomalie.',
    en: 'Road checklist: {points} failed.'
  },
  sourceInspectionSymptom: {
    fr: 'Visite technique non conforme : {findings}',
    en: 'Failed inspection: {findings}'
  }
} satisfies Record<string, LocalizedText>
