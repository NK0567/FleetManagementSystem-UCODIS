import type {
  DowntimeFamily,
  DowntimeRole
} from '@/modules/maintenance/downtime-codes/types/downtimeCode.types'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface DowntimeCodeRow extends MockRow {
  name: string
  family: DowntimeFamily
  systemRole: DowntimeRole | null
  active: boolean
}

const SEED: Omit<DowntimeCodeRow, keyof typeof seedAudit>[] = [
  {
    no: 'PNN',
    name: 'Panne',
    family: 'technical',
    systemRole: 'breakdown',
    active: true
  },
  {
    no: 'MTN',
    name: 'Entretien planifié',
    family: 'technical',
    systemRole: 'preventive',
    active: true
  },
  {
    no: 'DPN',
    name: 'Dépannage sur site',
    family: 'technical',
    systemRole: null,
    active: true
  },
  {
    no: 'ATP',
    name: 'Attente de pièce',
    family: 'technical',
    systemRole: null,
    active: true
  },
  {
    no: 'ACC',
    name: 'Accident',
    family: 'technical',
    systemRole: 'accident',
    active: true
  },
  {
    no: 'BRM',
    name: 'Barémage de la citerne',
    family: 'regulatory',
    systemRole: null,
    active: true
  },
  {
    no: 'MDT',
    name: 'Visite Madauto',
    family: 'regulatory',
    systemRole: null,
    active: true
  },
  {
    no: 'APV',
    name: 'Visite Apave',
    family: 'regulatory',
    systemRole: null,
    active: true
  },
  {
    no: 'VET',
    name: 'Vetting',
    family: 'regulatory',
    systemRole: null,
    active: true
  },
  {
    no: 'OBC',
    name: 'Système embarqué et caméras',
    family: 'regulatory',
    systemRole: null,
    active: true
  },
  {
    no: 'VIS',
    name: 'Visite technique',
    family: 'regulatory',
    systemRole: null,
    active: true
  },
  {
    no: 'DOC',
    name: 'Document obligatoire expiré',
    family: 'regulatory',
    systemRole: 'expired_document',
    active: true
  },
  {
    no: 'CTV',
    name: 'Contre-visite à passer',
    family: 'regulatory',
    systemRole: 'recheck',
    active: true
  },
  {
    no: 'EDP',
    name: 'Entretien dépassé',
    family: 'technical',
    systemRole: 'overdue_service',
    active: true
  },
  {
    no: 'DRG',
    name: 'Dérogation tracteur ou remorque',
    family: 'administrative',
    systemRole: null,
    active: true
  },
  {
    no: 'NDP',
    name: 'Note de protêt',
    family: 'administrative',
    systemRole: null,
    active: true
  },
  {
    no: 'DSC',
    name: 'Dossier du conducteur (permis, visite médicale, certificat de résidence)',
    family: 'administrative',
    systemRole: null,
    active: true
  },
  {
    no: 'ADM',
    name: 'Démarche administrative en cours',
    family: 'administrative',
    systemRole: null,
    active: true
  },
  {
    no: 'ABS',
    name: 'Absence du conducteur',
    family: 'human',
    systemRole: null,
    active: true
  },
  {
    no: 'CON',
    name: 'Congé du conducteur',
    family: 'human',
    systemRole: null,
    active: true
  },
  {
    no: 'TRH',
    name: 'Repos du conducteur',
    family: 'human',
    systemRole: null,
    active: true
  },
  {
    no: 'MED',
    name: 'Visite médicale systématique',
    family: 'human',
    systemRole: null,
    active: true
  },
  {
    no: 'SAN',
    name: 'Sanction du conducteur',
    family: 'human',
    systemRole: null,
    active: true
  }
]

/** The causes the application proposes, which the workshop can come back to. */
export function defaultDowntimeCodes(): Omit<DowntimeCodeRow, keyof typeof seedAudit>[] {
  return SEED.map((row) => ({ ...row }))
}

export const downtimeCodesCollection: CollectionDefinition<DowntimeCodeRow> = {
  name: 'downtime-codes',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit }))
}
