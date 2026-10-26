import type { ProductCompatibilityKind } from '@/modules/planning/product-compatibilities/types/productCompatibility.types'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface ProductCompatibilityRow extends MockRow {
  kind: ProductCompatibilityKind
  productANo: string
  productBNo: string
  active: boolean
}

const SEED: Omit<ProductCompatibilityRow, keyof typeof seedAudit>[] = [
  {
    no: 'CMP-001',
    kind: 'together',
    productANo: 'PRD-008',
    productBNo: 'PRD-007',
    active: true
  },
  {
    no: 'CMP-002',
    kind: 'succession',
    productANo: 'PRD-007',
    productBNo: 'PRD-006',
    active: true
  }
]

export const productCompatibilitiesCollection: CollectionDefinition<ProductCompatibilityRow> = {
  name: 'product-compatibilities',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit }))
}
