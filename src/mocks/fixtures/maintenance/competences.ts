import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface CompetenceRow extends MockRow {
  name: string
  active: boolean
}

const SEED: Omit<CompetenceRow, keyof typeof seedAudit>[] = [
  {
    no: 'MECHANICAL',
    name: 'Mécanique',
    active: true
  },
  {
    no: 'ELECTRICAL',
    name: 'Électricité',
    active: true
  },
  {
    no: 'TYRES',
    name: 'Pneumatique',
    active: true
  },
  {
    no: 'TANKER',
    name: 'Citerne et équipements de chargement',
    active: true
  }
]

export const competencesCollection: CollectionDefinition<CompetenceRow> = {
  name: 'competences',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit }))
}
