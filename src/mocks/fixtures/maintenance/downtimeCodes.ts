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
    no: 'VIS',
    name: 'Visite technique',
    family: 'regulatory',
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
    name: 'Absence de conducteur',
    family: 'human',
    systemRole: null,
    active: true
  }
]

export const downtimeCodesCollection: CollectionDefinition<DowntimeCodeRow> = {
  name: 'downtime-codes',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit }))
}
