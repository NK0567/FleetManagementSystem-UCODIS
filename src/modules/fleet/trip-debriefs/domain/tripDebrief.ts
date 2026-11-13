export const TRIP_DEBRIEF_STATUSES = ['draft', 'partly_signed', 'signed', 'closed'] as const
export type TripDebriefStatus = (typeof TRIP_DEBRIEF_STATUSES)[number]

/** The levels of the infraction table of the debriefing form. */
export const INFRACTION_LEVELS = [
  'nightDriving',
  'dailyWork',
  'dailyDriving',
  'continuousDriving',
  'weeklyRest',
  'dailyRest',
  'overspeed',
  'harshAcceleration',
  'harshBraking'
] as const
export type InfractionLevel = (typeof INFRACTION_LEVELS)[number]

/** Authorised stop on the travel plan: P for a pause, R for a rest. */
export const PLAN_STOP_KINDS = ['none', 'pause', 'rest', 'pause_rest'] as const
export type PlanStopKind = (typeof PLAN_STOP_KINDS)[number]

export interface PlanStop {
  place: string
  /** Planned time, HH:MM from the departure. */
  plannedTime: string
  /** Real time, HH:MM from the departure. */
  actualTime: string
  allowed: PlanStopKind
  observation: string
}

export function debriefStatus(facts: {
  driverSignedOn: string | null
  managerSignedOn: string | null
  closedOn: string | null
}): TripDebriefStatus {
  if (facts.closedOn) return 'closed'
  if (facts.driverSignedOn && facts.managerSignedOn) return 'signed'
  return facts.driverSignedOn || facts.managerSignedOn ? 'partly_signed' : 'draft'
}

export function infractionTotal(counts: Partial<Record<InfractionLevel, number | null>>): number {
  return INFRACTION_LEVELS.reduce((sum, level) => sum + (counts[level] ?? 0), 0)
}

export function tripDistanceKm(startKm: number | null, endKm: number | null): number | null {
  return startKm === null || endKm === null ? null : endKm - startKm
}

/** The client's indicator: infractions counted per 1000 km driven. */
export function infractionRate(total: number, distanceKm: number | null): number | null {
  if (!distanceKm || distanceKm <= 0) return null
  return Math.round((total * 10000) / distanceKm) / 10
}

export function isEditable(status: TripDebriefStatus): boolean {
  return status !== 'closed'
}
