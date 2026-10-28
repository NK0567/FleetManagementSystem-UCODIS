export interface ProductApi {
  no: string
  name: string
  family: string
  unit: string
  active: boolean
  isFuel: boolean
  referenceDensity: number | null
  expansionCoefficient: number | null
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type ProductSearchColumn = 'no' | 'name' | 'family' | 'no,name,family'
