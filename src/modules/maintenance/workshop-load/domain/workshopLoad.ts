export interface WorkshopCapacity {
  stations: number
  hoursPerDay: number
  workingDaysPerWeek: number
}

/** What is left to do on an order: its estimate less the time already logged, never below zero. */
export function remainingHours(estimatedHours: number, loggedHours: number): number {
  return Math.max(0, Math.round((estimatedHours - loggedHours) * 100) / 100)
}

export function capacityPerDay(capacity: WorkshopCapacity): number {
  return capacity.stations * capacity.hoursPerDay
}

/** Share of a working week the load fills, in percent; null when no capacity is set. */
export function occupancyRate(loadHours: number, capacity: WorkshopCapacity): number | null {
  const week = capacityPerDay(capacity) * capacity.workingDaysPerWeek
  return week > 0 ? Math.round((loadHours / week) * 100) : null
}

/** Working days the workshop needs to clear the load at full capacity. */
export function daysToAbsorb(loadHours: number, capacity: WorkshopCapacity): number | null {
  const perDay = capacityPerDay(capacity)
  return perDay > 0 ? Math.ceil(loadHours / perDay) : null
}

export type TechnicianIssue = 'inactive' | 'competence'

/** Why a technician cannot be planned on a job, if they cannot. */
export function technicianIssue(
  technician: { active: boolean; competences: readonly string[] },
  competenceNo: string | null
): TechnicianIssue | null {
  if (!technician.active) return 'inactive'
  if (competenceNo && !technician.competences.includes(competenceNo)) return 'competence'
  return null
}
