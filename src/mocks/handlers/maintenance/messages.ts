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
  }
} satisfies Record<string, LocalizedText>
