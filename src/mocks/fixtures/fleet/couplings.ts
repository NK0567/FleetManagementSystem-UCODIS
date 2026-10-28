import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface CouplingRow extends MockRow {
  tractorNo: string
  trailerNo: string
  startDate: string
  endDate: string | null
}

const SEED: Omit<CouplingRow, keyof typeof seedAudit>[] = [
  {
    no: 'CPL-0001',
    tractorNo: 'VEH-001',
    trailerNo: 'VEH-011',
    startDate: '2025-01-10',
    endDate: null
  },
  {
    no: 'CPL-0002',
    tractorNo: 'VEH-002',
    trailerNo: 'VEH-012',
    startDate: '2025-01-10',
    endDate: null
  },
  {
    no: 'CPL-0003',
    tractorNo: 'VEH-003',
    trailerNo: 'VEH-013',
    startDate: '2025-01-10',
    endDate: null
  },
  {
    no: 'CPL-0004',
    tractorNo: 'VEH-004',
    trailerNo: 'VEH-014',
    startDate: '2025-01-10',
    endDate: null
  },
  {
    no: 'CPL-0005',
    tractorNo: 'VEH-005',
    trailerNo: 'VEH-015',
    startDate: '2025-01-10',
    endDate: null
  },
  {
    no: 'CPL-0006',
    tractorNo: 'VEH-006',
    trailerNo: 'VEH-016',
    startDate: '2025-01-10',
    endDate: null
  },
  {
    no: 'CPL-0007',
    tractorNo: 'VEH-007',
    trailerNo: 'VEH-017',
    startDate: '2025-01-10',
    endDate: null
  },
  {
    no: 'CPL-0008',
    tractorNo: 'VEH-008',
    trailerNo: 'VEH-018',
    startDate: '2025-01-10',
    endDate: null
  },
  {
    no: 'CPL-0009',
    tractorNo: 'VEH-010',
    trailerNo: 'VEH-020',
    startDate: '2025-01-10',
    endDate: null
  }
]

export const couplingsCollection: CollectionDefinition<CouplingRow> = {
  name: 'couplings',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit }))
}
