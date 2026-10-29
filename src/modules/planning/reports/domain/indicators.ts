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
    place.siteNos.some((siteNo) => depots.has(siteNo)) ||
    place.regions.some((region) => regions.has(region))
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

/** Loaded weight (or volume) over the capacity of the means. */
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
  if (input.fuelCost === null && (input.distanceKm === null || input.costPerKm === null))
    return null
  const distance =
    input.distanceKm !== null && input.costPerKm !== null ? input.distanceKm * input.costPerKm : 0
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
  partial: number
  declared: number
  invoices: number
  invoicesOutside: number
  withoutTariff: number
  /** Sum of the gaps between the invoices and the tariff, over the invoices with a tariff. */
  invoiceGap: number
}

export function carrierIndicators(figures: CarrierFigures) {
  return {
    carrierNo: figures.carrierNo,
    orders: figures.orders,
    punctuality: punctualityRate(figures.onTime, figures.arrived),
    confirmation: confirmationRate(figures.attested, figures.declared),
    contestation: contestationRate(figures.contested, figures.declared),
    refusals: figures.refused,
    partials: figures.partial,
    invoices: figures.invoices,
    invoicesOutside: figures.invoicesOutside,
    withoutTariff: figures.withoutTariff,
    invoiceGap: Math.round(figures.invoiceGap * 100) / 100
  }
}

const minutes = (iso: string) => new Date(iso).getTime() / 60000

/** Minutes between the planned and the actual arrival; negative when early. */
export function delayMinutes(actual: string, planned: string): number {
  return Math.round(minutes(actual) - minutes(planned))
}

/** A delivery is on time when reached no later than planned plus the margin of the settings. */
export function arrivedOnTime(actual: string, planned: string, marginMin: number): boolean {
  return delayMinutes(actual, planned) <= marginMin
}

export interface RateGroup {
  key: string
  label: string
  onTime: number
  total: number
  rate: number | null
}

/** On-time rate by group (period, recipient or carrier), sorted by label. */
export function groupRates(
  items: readonly { key: string; label: string; onTime: boolean }[]
): RateGroup[] {
  const groups = new Map<string, RateGroup>()
  for (const item of items) {
    const group = groups.get(item.key) ?? {
      key: item.key,
      label: item.label,
      onTime: 0,
      total: 0,
      rate: null
    }
    group.total += 1
    if (item.onTime) group.onTime += 1
    group.rate = rate(group.onTime, group.total)
    groups.set(item.key, group)
  }
  return [...groups.values()].sort((left, right) => left.label.localeCompare(right.label))
}

export type LateKind = 'departure' | 'arrival'

/**
 * An order is late when it has not left past its planned departure, or is still on the road,
 * with deliveries pending, past its planned arrival. The margin of the settings applies to both.
 */
export function lateKind(
  order: {
    status: string
    plannedDeparture: string | null
    plannedArrival: string | null
    delivered: boolean
  },
  now: string,
  marginMin: number
): LateKind | null {
  const waiting = ['planned', 'confirmed', 'ready'].includes(order.status)
  if (waiting && order.plannedDeparture && delayMinutes(now, order.plannedDeparture) > marginMin)
    return 'departure'
  if (
    order.status === 'in_progress' &&
    !order.delivered &&
    order.plannedArrival &&
    delayMinutes(now, order.plannedArrival) > marginMin
  )
    return 'arrival'
  return null
}

export interface OutcomeLine {
  declaredAt: string | null
  refusalAt: string | null
  postponedAt: string | null
  returnedAt: string | null
  receptionContestedAt: string | null
  receivedQuantity: number | null
  /** Loaded quantity, or ordered when nothing was loaded. */
  reference: number
  /** Confirmed by the recipient, or held confirmed once the tacit delay is over. */
  attested: boolean
}

export interface DeliveryOutcomes {
  /** Lines that reached their recipient: declared, refused or postponed. */
  concerned: number
  confirmed: number
  partial: number
  refused: number
  postponed: number
  contested: number
  returned: number
}

export function deliveryOutcomes(lines: readonly OutcomeLine[]): DeliveryOutcomes {
  const outcomes: DeliveryOutcomes = {
    concerned: 0,
    confirmed: 0,
    partial: 0,
    refused: 0,
    postponed: 0,
    contested: 0,
    returned: 0
  }
  for (const line of lines) {
    if (!line.declaredAt && !line.refusalAt && !line.postponedAt) continue
    outcomes.concerned += 1
    if (line.declaredAt && line.attested) outcomes.confirmed += 1
    if (
      line.declaredAt &&
      line.receivedQuantity !== null &&
      line.receivedQuantity > 0 &&
      line.receivedQuantity < line.reference
    )
      outcomes.partial += 1
    if (line.refusalAt) outcomes.refused += 1
    if (line.postponedAt) outcomes.postponed += 1
    if (line.receptionContestedAt) outcomes.contested += 1
    if (line.returnedAt) outcomes.returned += 1
  }
  return outcomes
}

/** Average of the scores, with one decimal; nothing to average gives none. */
export function averageScore(values: readonly number[]): number | null {
  if (!values.length) return null
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
}

export interface FuelGapSummary {
  gainCount: number
  gainVolume: number
  lossCount: number
  lossVolume: number
  unqualified: number
}

/** Gaps at 15 °C on fuel: a gain is a surplus received, a loss (coulage) a shortage. */
export function fuelGapSummary(
  gaps: readonly { gap: number; qualification: 'gain' | 'loss' | null }[]
): FuelGapSummary {
  const summary: FuelGapSummary = {
    gainCount: 0,
    gainVolume: 0,
    lossCount: 0,
    lossVolume: 0,
    unqualified: 0
  }
  for (const item of gaps) {
    if (!item.gap) continue
    if (item.qualification === 'gain') {
      summary.gainCount += 1
      summary.gainVolume += Math.abs(item.gap)
    } else if (item.qualification === 'loss') {
      summary.lossCount += 1
      summary.lossVolume += Math.abs(item.gap)
    } else summary.unqualified += 1
  }
  return summary
}

/** What the carrier invoiced above (positive) or below the tariff; no tariff gives none. */
export function invoiceGap(amount: number, agreed: number | null): number | null {
  if (agreed === null) return null
  return Math.round((amount - agreed) * 100) / 100
}
