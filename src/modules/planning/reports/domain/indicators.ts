export interface Perimeter {
  depotNos: readonly string[]
  regions: readonly string[]
}

export interface Place {
  siteNos: readonly string[]
  regions: readonly string[]
}

/** No depot and no region means the user sees every place. A place we cannot locate stays visible. */
export function inPerimeter(perimeter: Perimeter | null, place: Place): boolean {
  if (!perimeter || (perimeter.depotNos.length === 0 && perimeter.regions.length === 0)) return true
  if (place.siteNos.length === 0 && place.regions.length === 0) return true
  const depots = new Set(perimeter.depotNos)
  const regions = new Set(perimeter.regions)
  return (
    place.siteNos.some((siteNo) => depots.has(siteNo)) || place.regions.some((region) => regions.has(region))
  )
}

/** Share of the part in the whole, as a percentage. Nothing to count gives no rate. */
export function rate(part: number, whole: number): number | null {
  if (whole <= 0) return null
  return Math.round((part / whole) * 100)
}

export const punctualityRate = (onTime: number, arrived: number) => rate(onTime, arrived)

export const confirmationRate = (attested: number, declared: number) => rate(attested, declared)

export const contestationRate = (contested: number, declared: number) => rate(contested, declared)

/** Loaded weight over the capacity of the means. */
export function fillRate(weightKg: number, capacityKg: number): number | null {
  if (capacityKg <= 0) return null
  return Math.round((weightKg / capacityKg) * 100)
}

/** A carrier order costs its invoiced amount. A fleet order costs fuel plus the distance cost. */
export function orderCost(input: {
  carrierAmount: number | null
  fuelCost: number | null
  distanceKm: number | null
  costPerKm: number | null
}): number | null {
  if (input.carrierAmount !== null) return input.carrierAmount
  if (input.fuelCost === null && (input.distanceKm === null || input.costPerKm === null)) return null
  const distance = input.distanceKm !== null && input.costPerKm !== null ? input.distanceKm * input.costPerKm : 0
  return Math.round((input.fuelCost ?? 0) + distance)
}

export interface CarrierFigures {
  carrierNo: string
  orders: number
  onTime: number
  arrived: number
  attested: number
  contested: number
  refused: number
  declared: number
  invoices: number
  invoicesOutside: number
  withoutTariff: number
}

export function carrierIndicators(figures: CarrierFigures) {
  return {
    carrierNo: figures.carrierNo,
    orders: figures.orders,
    punctuality: punctualityRate(figures.onTime, figures.arrived),
    confirmation: confirmationRate(figures.attested, figures.declared),
    contestation: contestationRate(figures.contested, figures.declared),
    refusals: figures.refused,
    invoices: figures.invoices,
    invoicesOutside: figures.invoicesOutside,
    withoutTariff: figures.withoutTariff
  }
}
