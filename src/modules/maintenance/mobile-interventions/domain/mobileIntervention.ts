export const MOBILE_INTERVENTION_STATUSES = [
  'en_route',
  'on_site',
  'resolved',
  'unresolved'
] as const
export type MobileInterventionStatus = (typeof MOBILE_INTERVENTION_STATUSES)[number]

export function mobileInterventionStatus(intervention: {
  arrivedAt: string | null
  closedAt: string | null
  resolved: boolean | null
}): MobileInterventionStatus {
  if (intervention.closedAt) return intervention.resolved ? 'resolved' : 'unresolved'
  return intervention.arrivedAt ? 'on_site' : 'en_route'
}

const MINUTE_MS = 60_000

export function minutesBetween(from: string | null, to: string | null): number | null {
  if (!from || !to) return null
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / MINUTE_MS)
}

export interface MobileKpiInput {
  departedAt: string
  arrivedAt: string | null
  closedAt: string | null
  resolved: boolean | null
  isControl: boolean
  checkCount: number | null
  positiveCount: number | null
}

export interface MobileKpis {
  interventions: number
  /** Closed repair missions solved on the spot, in percent; control missions do not count. */
  resolutionRate: number | null
  /** Departure to closing, closed missions only. */
  averageTimeMin: number | null
  /** Departure to arrival on site. */
  averageDelayMin: number | null
  checks: number
  positives: number
}

const average = (values: (number | null)[]) => {
  const known = values.filter((value): value is number => value !== null)
  return known.length
    ? Math.round(known.reduce((total, value) => total + value, 0) / known.length)
    : null
}

/** Indicators of the missions that left in a calendar month (`YYYY-MM`), as the targets are set per month. */
export function mobileKpis(interventions: readonly MobileKpiInput[], month: string): MobileKpis {
  const own = interventions.filter((item) => item.departedAt.slice(0, 7) === month)
  const repairs = own.filter((item) => !item.isControl && item.closedAt)
  return {
    interventions: own.length,
    resolutionRate: repairs.length
      ? Math.round((repairs.filter((item) => item.resolved).length / repairs.length) * 100)
      : null,
    averageTimeMin: average(own.map((item) => minutesBetween(item.departedAt, item.closedAt))),
    averageDelayMin: average(own.map((item) => minutesBetween(item.departedAt, item.arrivedAt))),
    checks: own.reduce((total, item) => total + (item.checkCount ?? 0), 0),
    positives: own.reduce((total, item) => total + (item.positiveCount ?? 0), 0)
  }
}
