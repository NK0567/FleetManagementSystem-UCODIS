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
  }
} satisfies Record<string, LocalizedText>
