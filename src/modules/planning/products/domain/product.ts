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
