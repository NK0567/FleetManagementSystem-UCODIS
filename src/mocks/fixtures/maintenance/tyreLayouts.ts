import type { TyreAxle } from '@/modules/maintenance/tyres/domain/tyre'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface TyreLayoutRow extends MockRow {
  axles: TyreAxle[]
  spares: number
}

const single = (label: string) => ({ label, twin: false })

const SEED: Omit<TyreLayoutRow, keyof typeof seedAudit>[] = [
  {
    no: 'TRACTOR',
    axles: [single('Essieu avant (direction)'), { label: 'Essieu arrière (traction)', twin: true }],
    spares: 1
  },
  {
    no: 'SEMI-TRAILER',
    axles: [single('Essieu 1'), single('Essieu 2'), single('Essieu 3')],
    spares: 0
  },
  { no: 'TANKER', axles: [single('Essieu 1'), single('Essieu 2'), single('Essieu 3')], spares: 1 }
]

export const tyreLayoutsCollection: CollectionDefinition<TyreLayoutRow> = {
  name: 'tyre-layouts',
  seed: () => SEED.map((row) => ({ ...structuredClone(row), ...seedAudit }))
}
