export const TYRE_STATUSES = ['stock', 'mounted', 'retreading', 'scrapped'] as const
export type TyreStatus = (typeof TYRE_STATUSES)[number]

export interface TyreAxle {
  label: string
  twin: boolean
}

/** How a vehicle type carries its tyres: axles front to back, then spares. */
export interface TyreLayout {
  axles: TyreAxle[]
  spares: number
}

export interface TyrePosition {
  code: string
  axleLabel: string
  /** 0 is the front axle; null for a spare. */
  axleRank: number | null
  side: 'left' | 'right' | 'left_outer' | 'left_inner' | 'right_inner' | 'right_outer' | null
  spare: boolean
}

/** Positions numbered front to back, left to right; spares are S1, S2… */
export function layoutPositions(layout: TyreLayout): TyrePosition[] {
  const positions: TyrePosition[] = []
  let number = 0
  layout.axles.forEach((axle, rank) => {
    const sides = axle.twin
      ? (['left_outer', 'left_inner', 'right_inner', 'right_outer'] as const)
      : (['left', 'right'] as const)
    for (const side of sides) {
      positions.push({
        code: String(++number),
        axleLabel: axle.label,
        axleRank: rank,
        side,
        spare: false
      })
    }
  })
  for (let spare = 1; spare <= layout.spares; spare++) {
    positions.push({ code: `S${spare}`, axleLabel: '', axleRank: null, side: null, spare: true })
  }
  return positions
}

export type LayoutIssue = 'noAxle' | 'axleLabel' | 'spares'

export function layoutIssues(layout: TyreLayout): LayoutIssue[] {
  const issues: LayoutIssue[] = []
  if (!layout.axles.length) issues.push('noAxle')
  if (layout.axles.some((axle) => !axle.label.trim())) issues.push('axleLabel')
  if (!Number.isInteger(layout.spares) || layout.spares < 0 || layout.spares > 4)
    issues.push('spares')
  return issues
}

/** A stint of a tyre on a vehicle; `toKm` is null while it is still mounted. */
export interface TyreMounting {
  vehicleNo: string
  positionCode: string
  fromKm: number
  toKm: number | null
}

/** Km run by a stint; the open one runs to the vehicle's current odometer. */
export function stintKm(mounting: TyreMounting, currentKm: (vehicleNo: string) => number): number {
  return Math.max(0, (mounting.toKm ?? currentKm(mounting.vehicleNo)) - mounting.fromKm)
}

/** A tyre's cost goes to the vehicles it ran on, in proportion to the km run on each. */
export function tyreCostShare(
  cost: number,
  kmByVehicle: ReadonlyMap<string, number>
): Map<string, number> {
  const total = [...kmByVehicle.values()].reduce((sum, km) => sum + km, 0)
  return new Map(
    [...kmByVehicle].map(([vehicleNo, km]) => [
      vehicleNo,
      total ? Math.round((cost * km) / total) : 0
    ])
  )
}

export function costPerKm(cost: number, km: number): number | null {
  return km > 0 ? Math.round((cost / km) * 100) / 100 : null
}

export interface TyreThresholds {
  minPressureBar: number
  minTreadMm: number
  rotationKm: number
  rotationMonths: number
}

/** A mounted tyre whose last reading is at or under a safety threshold. */
export function safetyAlert(
  reading: { pressureBar: number; treadMm: number } | null,
  thresholds: Pick<TyreThresholds, 'minPressureBar' | 'minTreadMm'>
): ('pressure' | 'tread')[] {
  if (!reading) return []
  return [
    ...(reading.pressureBar <= thresholds.minPressureBar ? (['pressure'] as const) : []),
    ...(reading.treadMm <= thresholds.minTreadMm ? (['tread'] as const) : [])
  ]
}

const DAY_MS = 86_400_000
/** Average month, so six months is about 183 days whatever the calendar. */
const MONTH_DAYS = 30.44

/** Rotation is due after so many km or months on the same position; never for a spare. */
export function rotationDue(
  since: { km: number; date: string },
  current: { km: number; today: string },
  thresholds: Pick<TyreThresholds, 'rotationKm' | 'rotationMonths'>,
  spare: boolean
): boolean {
  if (spare) return false
  const months =
    (new Date(current.today).getTime() - new Date(since.date.slice(0, 10)).getTime()) /
    DAY_MS /
    MONTH_DAYS
  return current.km - since.km >= thresholds.rotationKm || months >= thresholds.rotationMonths
}

/** DOT date code: week then year, `wwyy`, week 1 to 53. */
export function isDotCode(value: string): boolean {
  if (!/^\d{4}$/.test(value)) return false
  const week = Number(value.slice(0, 2))
  return week >= 1 && week <= 53
}
