import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface PerimeterRow extends MockRow {
  depotNos: string[]
  regions: string[]
}

const SEED: Omit<PerimeterRow, keyof typeof seedAudit>[] = [
  { no: 'DIR001', depotNos: [], regions: ['Boeny'] }
]

export const perimetersCollection: CollectionDefinition<PerimeterRow> = {
  name: 'planning-perimeters',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit }))
}
