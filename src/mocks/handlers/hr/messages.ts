import type { LocalizedText } from '../../i18n'

export const HR_MESSAGES = {
  unknownReference: {
    fr: "La valeur choisie pour « {field} » n'existe pas.",
    en: 'The value chosen for "{field}" does not exist.'
  },
  categoryInUse: {
    fr: 'Des employés sont rattachés à cette catégorie : elle ne peut pas être supprimée.',
    en: 'Employees belong to this category: it cannot be deleted.'
  },
  jobPositionInUse: {
    fr: 'Des employés occupent cette fonction : elle ne peut pas être supprimée.',
    en: 'Employees hold this position: it cannot be deleted.'
  },
  leaveTypeInUse: {
    fr: 'Des demandes utilisent ce type de congé : il ne peut pas être supprimé.',
    en: 'Requests use this leave type: it cannot be deleted.'
  },
  statutoryLeaveType: {
    fr: 'Ce type de congé est imposé par la loi : il ne peut être ni désactivé ni supprimé.',
    en: 'This leave type is required by law: it cannot be disabled or deleted.'
  },
  orgUnitHasChildren: {
    fr: 'Cette entité a des sous-entités : rattachez-les ailleurs avant de la supprimer.',
    en: 'This unit has sub-units: move them elsewhere before deleting it.'
  },
  orgUnitHasEmployees: {
    fr: 'Des employés sont rattachés à cette entité : elle ne peut pas être supprimée.',
    en: 'Employees belong to this unit: it cannot be deleted.'
  },
  orgUnitCycle: {
    fr: "Une entité ne peut pas être rattachée à elle-même ni à l'une de ses sous-entités.",
    en: 'A unit cannot be attached to itself or to one of its sub-units.'
  },
  orgUnitAlreadyValidated: {
    fr: 'Cette entité est déjà validée.',
    en: 'This unit is already validated.'
  },
  duplicateNationalId: {
    fr: "Cette pièce d'identité est déjà enregistrée pour l'employé {no}.",
    en: 'This identity document is already registered for employee {no}.'
  },
  employeeArchived: {
    fr: 'Cet employé a quitté les effectifs : sa fiche ne peut plus être modifiée.',
    en: 'This employee has left: the record can no longer be changed.'
  },
  statusReasonRequired: {
    fr: 'Indiquez le motif de ce changement de statut.',
    en: 'Give the reason for this status change.'
  },
  invalidPeriod: {
    fr: 'La date de fin précède la date de début.',
    en: 'The end date is before the start date.'
  },
  noWorkingDay: {
    fr: 'La période choisie ne contient aucun jour ouvré.',
    en: 'The chosen period contains no working day.'
  },
  leaveOverlap: {
    fr: 'Une demande en attente ou approuvée couvre déjà une partie de cette période.',
    en: 'A pending or approved request already covers part of this period.'
  },
  inactiveEmployee: {
    fr: "Cet employé n'est plus en activité.",
    en: 'This employee is no longer on staff.'
  },
  inactiveLeaveType: {
    fr: "Ce type de congé n'est plus proposé.",
    en: 'This leave type is no longer offered.'
  },
  leaveNotPending: {
    fr: "Cette demande a déjà été traitée : seule une demande en attente peut l'être.",
    en: 'This request has already been decided: only a pending request can be.'
  },
  decisionCommentRequired: {
    fr: 'Expliquez votre décision en au moins {min} caractères.',
    en: 'Explain your decision in at least {min} characters.'
  }
} satisfies Record<string, LocalizedText>
