export interface RefillPoint {
  no: string
  refueledAt: string
  liters: number
  unitPrice: number
  odometerKm: number
  fullTank: boolean
}

export interface ConsumptionPeriod {
  openingNo: string
  closingNo: string
  from: string
  to: string
  km: number
  liters: number
  /** Fuel price over the period, weighted by the litres of each refill. */
  averagePrice: number
}

/**
 * Full-to-full periods: between two full refills, the vehicle burnt what was put in after the
 * first one, up to and including the second.
 */
export function consumptionPeriods(refills: readonly RefillPoint[]): ConsumptionPeriod[] {
  const sorted = [...refills].sort((a, b) => a.refueledAt.localeCompare(b.refueledAt))
  const periods: ConsumptionPeriod[] = []
  let opening: RefillPoint | null = null
  let since: RefillPoint[] = []
  for (const refill of sorted) {
    if (opening) since.push(refill)
    if (!refill.fullTank) continue
    if (opening) {
      const liters = since.reduce((total, item) => total + item.liters, 0)
      const cost = since.reduce((total, item) => total + item.liters * item.unitPrice, 0)
      periods.push({
        openingNo: opening.no,
        closingNo: refill.no,
        from: opening.refueledAt,
        to: refill.refueledAt,
        km: refill.odometerKm - opening.odometerKm,
        liters,
        averagePrice: liters ? cost / liters : 0
      })
    }
    opening = refill
    since = []
  }
  return periods
}

const round1 = (value: number) => Math.round(value * 10) / 10

export function litersPer100(liters: number, km: number): number | null {
  return km > 0 ? round1((liters / km) * 100) : null
}

/** One formula everywhere: total litres over total distance, never an average of averages. */
export function averageLitersPer100(
  periods: readonly Pick<ConsumptionPeriod, 'km' | 'liters'>[]
): number | null {
  const km = periods.reduce((total, period) => total + Math.max(0, period.km), 0)
  const liters = periods.reduce((total, period) => total + period.liters, 0)
  return litersPer100(liters, km)
}

export type ReferenceSource = 'vehicle' | 'route' | 'vehicleType' | 'default'

/**
 * The reference set for the vehicle itself, on the corridor or on all of them, wins; then the
 * route knows the road best, then the vehicle type, then the fleet default.
 */
export function consumptionReference(
  vehicleL100: number | null,
  routeL100: number | null,
  vehicleTypeL100: number | null,
  defaultL100: number
): { value: number; source: ReferenceSource } {
  if (vehicleL100 !== null) return { value: vehicleL100, source: 'vehicle' }
  if (routeL100 !== null) return { value: routeL100, source: 'route' }
  if (vehicleTypeL100 !== null) return { value: vehicleTypeL100, source: 'vehicleType' }
  return { value: defaultL100, source: 'default' }
}

export function gapPercent(l100: number, reference: number): number {
  return round1(((l100 - reference) / reference) * 100)
}

/** What the litres beyond the reference cost; nothing when the vehicle burnt less. */
export function excessCost(
  period: Pick<ConsumptionPeriod, 'km' | 'liters' | 'averagePrice'>,
  reference: number
): number {
  const excess = period.liters - (reference * period.km) / 100
  return Math.max(0, Math.round(excess * period.averagePrice))
}

export const FUEL_GAP_STATUSES = [
  'normal',
  'to_qualify',
  'qualified',
  'deduction_proposed',
  'deduction_approved',
  'deduction_rejected',
  'dismissed'
] as const
export type FuelGapStatus = (typeof FUEL_GAP_STATUSES)[number]

export type DeductionIssue = 'causeNotChargeable' | 'aboveExcessCost' | 'aboveCap'

export function deductionIssues(
  amount: number,
  chargeable: boolean,
  excess: number,
  cap: number | null
): DeductionIssue[] {
  const issues: DeductionIssue[] = []
  if (!chargeable) issues.push('causeNotChargeable')
  if (amount > excess) issues.push('aboveExcessCost')
  if (cap !== null && amount > cap) issues.push('aboveCap')
  return issues
}

/**
 * What may still be withheld from the driver this month: the share of his salary set by the
 * applicable labour law, less the deductions already proposed or approved for the month.
 */
export function withholdableAmount(salary: number, maxSalaryPct: number, otherThisMonth: number) {
  return Math.max(0, Math.floor((salary * maxSalaryPct) / 100) - otherThisMonth)
}

/** Energies that emit little: the vehicles running on them make the low-emission share. */
export const LOW_EMISSION_FUELS = ['electric', 'hybrid'] as const

export function lowEmissionShare(fuelTypes: readonly (string | null)[]) {
  const motorized = fuelTypes.filter((fuel): fuel is string => fuel !== null)
  const low = motorized.filter((fuel) => (LOW_EMISSION_FUELS as readonly string[]).includes(fuel))
  return {
    motorized: motorized.length,
    lowEmission: low.length,
    sharePct: motorized.length ? Math.round((low.length / motorized.length) * 100) : null
  }
}
