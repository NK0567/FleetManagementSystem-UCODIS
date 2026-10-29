import type { ProductMeasure } from '../domain/product'

export interface ProductApi {
  no: string
  name: string
  family: string
  unit: string
  active: boolean
  isFuel: boolean
  referenceDensity: number | null
  expansionCoefficient: number | null
  /** Weight and volume of one unit, to work out those of an order line (TRS01-US08). */
  unitWeightKg: number | null
  unitVolumeM3: number | null
  /** What is measured at loading and at delivery (TRS06-US04, TRS07-US08). */
  loadingMeasures: ProductMeasure[]
  deliveryMeasures: ProductMeasure[]
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type ProductSearchColumn = 'no' | 'name' | 'family' | 'no,name,family'
