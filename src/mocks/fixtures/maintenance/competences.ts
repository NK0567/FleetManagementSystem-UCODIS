import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface CompetenceRow extends MockRow {
  name: string
  active: boolean
  /** Hourly labour rate of this specialty; the workshop's single rate applies when empty. */
  hourlyRate?: number | null
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
    active: true,
    hourlyRate: 12_000
  },
  {
    no: 'TYRES',
    name: 'Pneumatique',
    active: true
  },
  {
    no: 'TANKER',
    name: 'Citerne et équipements de chargement',
    active: true,
    hourlyRate: 15_000
  }
]

export const competencesCollection: CollectionDefinition<CompetenceRow> = {
  name: 'competences',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit }))
}
