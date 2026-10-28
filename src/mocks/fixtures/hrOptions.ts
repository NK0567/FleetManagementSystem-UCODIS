import type { LocalizedText } from '../i18n'

export const HR_OPTION_SETS: Record<string, Record<string, LocalizedText>> = {
  orgUnitType: {
    directorate: { fr: 'Direction', en: 'Directorate' },
    department: { fr: 'Service', en: 'Department' },
    team: { fr: 'Équipe', en: 'Team' }
  },
  orgUnitStatus: {
    validated: { fr: 'Validée', en: 'Validated' },
    pending_validation: { fr: 'À valider', en: 'Pending validation' }
  },
  employeeStatus: {
    active: { fr: 'Actif', en: 'Active' },
    on_leave: { fr: 'En congé', en: 'On leave' },
    suspended: { fr: 'Suspendu', en: 'Suspended' },
    contract_ended: { fr: 'Fin de contrat', en: 'Contract ended' },
    archived: { fr: 'Archivé', en: 'Archived' }
  },
  contractType: {
    permanent: { fr: 'CDI', en: 'Permanent' },
    fixed_term: { fr: 'CDD', en: 'Fixed term' }
  },
  gender: {
    female: { fr: 'Femme', en: 'Female' },
    male: { fr: 'Homme', en: 'Male' }
  },
  maritalStatus: {
    single: { fr: 'Célibataire', en: 'Single' },
    married: { fr: 'Marié(e)', en: 'Married' },
    divorced: { fr: 'Divorcé(e)', en: 'Divorced' },
    widowed: { fr: 'Veuf ou veuve', en: 'Widowed' }
  },
  idDocumentType: {
    national_id: { fr: "Carte d'identité nationale", en: 'National identity card' },
    passport: { fr: 'Passeport', en: 'Passport' },
    residence_permit: { fr: 'Permis de séjour', en: 'Residence permit' }
  },
  leaveRequestStatus: {
    pending: { fr: 'En attente', en: 'Pending' },
    approved: { fr: 'Approuvée', en: 'Approved' },
    sent_back: { fr: 'Retournée', en: 'Sent back' },
    rejected: { fr: 'Refusée', en: 'Rejected' }
  }
}
