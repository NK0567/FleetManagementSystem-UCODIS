import { minutesBetween } from '@/utils/date'

export const REFILL_CHECK_CODES = ['tank', 'odometer', 'driver', 'hours', 'gps'] as const
export type RefillCheckCode = (typeof REFILL_CHECK_CODES)[number]

export const REFILL_STATUSES = ['valid', 'anomaly', 'qualified'] as const
export type RefillStatus = (typeof REFILL_STATUSES)[number]

export const REFILL_CHANNELS = ['manual', 'mobile', 'import', 'card'] as const
export type RefillChannel = (typeof REFILL_CHANNELS)[number]

export interface RefillFacts {
  liters: number
  tankCapacityL: number | null
  odometerKm: number
  previousOdometerKm: number | null
  driverNo: string | null
  /** Drivers the vehicle had that day: its assignment and its trip. */
  expectedDriverNos: readonly string[]
  hour: number
  startHour: number
  endHour: number
  gpsGapKm: number | null
  gpsGapMaxKm: number
}

/** The window may run past midnight: from 20 to 4 means evening and early morning. */
export function hourInWindow(hour: number, start: number, end: number): boolean {
  return start <= end ? hour >= start && hour < end : hour >= start || hour < end
}

export function refillChecks(facts: RefillFacts): Record<RefillCheckCode, boolean> {
  return {
    tank: facts.tankCapacityL === null || facts.liters <= facts.tankCapacityL,
    odometer: facts.previousOdometerKm === null || facts.odometerKm > facts.previousOdometerKm,
    driver: !!facts.driverNo && facts.expectedDriverNos.includes(facts.driverNo),
    hours: hourInWindow(facts.hour, facts.startHour, facts.endHour),
    gps: facts.gpsGapKm === null || facts.gpsGapKm <= facts.gpsGapMaxKm
  }
}

/** A refill with a failed check stays an anomaly until someone qualifies it. */
export function refillStatus(
  checks: Record<RefillCheckCode, boolean>,
  qualified: boolean
): RefillStatus {
  if (qualified) return 'qualified'
  return Object.values(checks).every(Boolean) ? 'valid' : 'anomaly'
}

/** The same volume put in the same vehicle within ten minutes is one refill entered twice. */
export function isDuplicateRefill(
  a: { vehicleNo: string; liters: number; refueledAt: string },
  b: { vehicleNo: string; liters: number; refueledAt: string }
): boolean {
  return (
    a.vehicleNo === b.vehicleNo &&
    a.liters === b.liters &&
    Math.abs(minutesBetween(a.refueledAt, b.refueledAt)) < 10
  )
}
