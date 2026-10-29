interface FuelFields {
  isFuel: boolean
  referenceDensity: number | null
  expansionCoefficient: number | null
}

/** A fuel is measured at 15 °C, which needs its reference density. */
export function productNeedsDensity(product: FuelFields): boolean {
  return product.isFuel && product.referenceDensity == null
}

/** Only a fuel keeps its density and expansion coefficient. */
export function withFuelFields<T extends FuelFields>(product: T): T {
  return product.isFuel
    ? product
    : { ...product, referenceDensity: null, expansionCoefficient: null }
}

/** What is measured on a product at loading and at delivery (TRS06-US04, TRS07-US08). */
export const PRODUCT_MEASURES = [
  'quantity',
  'weight',
  'temperature',
  'density',
  'volume15'
] as const
export type ProductMeasure = (typeof PRODUCT_MEASURES)[number]

/** Measured for a fuel only: the volume at 15 °C needs its temperature and density. */
export const FUEL_MEASURES: readonly ProductMeasure[] = ['temperature', 'density', 'volume15']

/** The measures taken by default: the quantity, and for a fuel what gives the volume at 15 °C. */
export function defaultMeasures(isFuel: boolean): ProductMeasure[] {
  return isFuel ? ['quantity', 'temperature', 'density', 'volume15'] : ['quantity']
}

export type MeasureIssue = 'quantityRequired' | 'fuelOnly'

export function measureIssues(
  isFuel: boolean,
  measures: readonly ProductMeasure[]
): MeasureIssue[] {
  const issues: MeasureIssue[] = []
  if (!measures.includes('quantity')) issues.push('quantityRequired')
  if (!isFuel && measures.some((measure) => FUEL_MEASURES.includes(measure)))
    issues.push('fuelOnly')
  return issues
}
