import type { ProductMeasure } from '@/modules/planning/products/domain/product'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface ProductRow extends MockRow {
  name: string
  family: string
  unit: string
  active: boolean
  isFuel: boolean
  referenceDensity: number | null
  expansionCoefficient: number | null
  /** Absent on a row stored before they existed: read as unknown, and the default measures. */
  unitWeightKg?: number | null
  unitVolumeM3?: number | null
  loadingMeasures?: ProductMeasure[]
  deliveryMeasures?: ProductMeasure[]
}

const SEED: Omit<ProductRow, keyof typeof seedAudit>[] = [
  {
    no: 'PRD-001',
    name: 'Produits alimentaires secs',
    family: 'Alimentaire',
    unit: 'Carton',
    isFuel: false,
    referenceDensity: null,
    expansionCoefficient: null,
    active: true
  },
  {
    no: 'PRD-002',
    name: 'Produits ménagers',
    family: 'Entretien',
    unit: 'Carton',
    isFuel: false,
    referenceDensity: null,
    expansionCoefficient: null,
    active: true
  },
  {
    no: 'PRD-003',
    name: 'Boissons',
    family: 'Alimentaire',
    unit: 'Carton',
    isFuel: false,
    referenceDensity: null,
    expansionCoefficient: null,
    active: true
  },
  {
    no: 'PRD-004',
    name: 'Textile',
    family: 'Textile',
    unit: 'Colis',
    isFuel: false,
    referenceDensity: null,
    expansionCoefficient: null,
    active: true
  },
  {
    no: 'PRD-005',
    name: 'Matériaux de construction',
    family: 'Construction',
    unit: 'Kilogramme',
    isFuel: false,
    referenceDensity: null,
    expansionCoefficient: null,
    active: true
  },
  {
    no: 'PRD-006',
    name: 'Gazole',
    family: 'Carburant',
    unit: 'Litre',
    isFuel: true,
    referenceDensity: 0.845,
    expansionCoefficient: 0.0008,
    active: true
  },
  {
    no: 'PRD-007',
    name: 'Essence sans plomb',
    family: 'Carburant',
    unit: 'Litre',
    isFuel: true,
    referenceDensity: 0.745,
    expansionCoefficient: 0.0012,
    active: true
  },
  {
    no: 'PRD-008',
    name: 'Pétrole lampant',
    family: 'Carburant',
    unit: 'Litre',
    isFuel: true,
    referenceDensity: 0.79,
    expansionCoefficient: 0.0009,
    active: true
  }
]

export const productsCollection: CollectionDefinition<ProductRow> = {
  name: 'products',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit }))
}
