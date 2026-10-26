import type { ToleranceUnit } from '@/modules/planning/quantity-tolerances/types/quantityTolerance.types'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface QuantityToleranceRow extends MockRow {
  customerNo: string | null
  productNo: string | null
  value: number
  unit: ToleranceUnit
}

const SEED: Omit<QuantityToleranceRow, keyof typeof seedAudit>[] = [
  {
    no: 'TOL-001',
    customerNo: null,
    productNo: null,
    value: 0.5,
    unit: 'percent'
  },
  {
    no: 'TOL-002',
    customerNo: 'CLI-001',
    productNo: null,
    value: 1,
    unit: 'percent'
  },
  {
    no: 'TOL-003',
    customerNo: null,
    productNo: 'PRD-006',
    value: 20,
    unit: 'quantity'
  }
]

export const quantityTolerancesCollection: CollectionDefinition<QuantityToleranceRow> = {
  name: 'quantity-tolerances',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit }))
}
