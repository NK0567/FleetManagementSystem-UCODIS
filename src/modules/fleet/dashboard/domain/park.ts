import { daysBetween } from '@/utils/date'

const DAYS_PER_YEAR = 365.25

/** Age of a vehicle in years: from its first registration, or else from its model year. */
export function vehicleAgeYears(
  vehicle: { firstRegistrationDate: string | null; year: number | null },
  today: string
): number | null {
  if (vehicle.firstRegistrationDate) {
    return (
      Math.max(0, daysBetween(vehicle.firstRegistrationDate.slice(0, 10), today)) / DAYS_PER_YEAR
    )
  }
  if (vehicle.year) return Math.max(0, Number(today.slice(0, 4)) - vehicle.year)
  return null
}

/** Mean age of the vehicles whose age is known, to one decimal; null when none is. */
export function averageAgeYears(
  vehicles: readonly { firstRegistrationDate: string | null; year: number | null }[],
  today: string
): number | null {
  const ages = vehicles
    .map((vehicle) => vehicleAgeYears(vehicle, today))
    .filter((age): age is number => age !== null)
  if (!ages.length) return null
  return Math.round((ages.reduce((total, age) => total + age, 0) / ages.length) * 10) / 10
}

/** Where the availability stands against its target. */
export function againstTarget(rate: number | null, target: number): 'reached' | 'missed' | null {
  if (rate === null) return null
  return rate >= target ? 'reached' : 'missed'
}
