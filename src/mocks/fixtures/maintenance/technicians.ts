import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface TechnicianRow extends MockRow {
  competences: string[]
  active: boolean
}

const SEED: Omit<TechnicianRow, keyof typeof seedAudit>[] = [
  {
    no: 'UCT-003',
    competences: ['MECHANICAL', 'TYRES'],
    active: true
  },
  {
    no: 'UCT-008',
    competences: ['MECHANICAL', 'ELECTRICAL'],
    active: true
  }
]

export const techniciansCollection: CollectionDefinition<TechnicianRow> = {
  name: 'technicians',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit }))
}
