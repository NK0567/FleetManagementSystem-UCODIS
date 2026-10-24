import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface MissionTypeRow extends MockRow {
  name: string
  isControl: boolean
  active: boolean
}

const SEED: Omit<MissionTypeRow, keyof typeof seedAudit>[] = [
  {
    no: 'MECHANICAL',
    name: 'Dépannage mécanique',
    isControl: false,
    active: true
  },
  {
    no: 'ELECTRICAL',
    name: 'Dépannage électrique',
    isControl: false,
    active: true
  },
  {
    no: 'SECURING',
    name: 'Sécurisation',
    isControl: false,
    active: true
  },
  {
    no: 'ALCOHOL-DRUGS',
    name: 'Contrôle alcool et drogue',
    isControl: true,
    active: true
  },
  {
    no: 'STOWAWAYS',
    name: 'Détection de passagers clandestins',
    isControl: true,
    active: true
  },
  {
    no: 'DRIVING-WATCH',
    name: 'Surveillance du comportement de conduite',
    isControl: true,
    active: true
  }
]

export const missionTypesCollection: CollectionDefinition<MissionTypeRow> = {
  name: 'mission-types',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit }))
}
