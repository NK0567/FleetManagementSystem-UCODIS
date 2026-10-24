export const DOWNTIME_STATUSES = ['open', 'closed'] as const
export type DowntimeStatus = (typeof DOWNTIME_STATUSES)[number]

export const DOWNTIME_ORIGINS = ['manual', 'work_order'] as const
export type DowntimeOrigin = (typeof DOWNTIME_ORIGINS)[number]

const DAY_MS = 86_400_000

export function downtimeStatus(downtime: { endedAt: string | null }): DowntimeStatus {
  return downtime.endedAt ? 'closed' : 'open'
}

/** Days without the vehicle, to the hundredth: half a day costs half a day. */
export function downtimeDays(startedAt: string, endedAt: string | null, now: string): number {
  const end = new Date(endedAt ?? now).getTime()
  const days = Math.max(0, end - new Date(startedAt).getTime()) / DAY_MS
  return Math.round(days * 100) / 100
}

/** Lost days that fall inside a period, for indicators over a window. */
export function downtimeDaysWithin(
  startedAt: string,
  endedAt: string | null,
  now: string,
  from: string,
  to: string
): number {
  const start = Math.max(new Date(startedAt).getTime(), new Date(from).getTime())
  const end = Math.min(new Date(endedAt ?? now).getTime(), new Date(to).getTime())
  return end > start ? Math.round(((end - start) / DAY_MS) * 100) / 100 : 0
}

export interface DayCosts {
  dayCost: number
  tractorDayCost: number | null
  trailerDayCost: number | null
}

/** A motor vehicle and a trailer may cost differently; the average stands in for the missing one. */
export function dayCostOf(motorized: boolean, costs: DayCosts): number {
  return (motorized ? costs.tractorDayCost : costs.trailerDayCost) ?? costs.dayCost
}
