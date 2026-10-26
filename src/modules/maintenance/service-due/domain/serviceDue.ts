import { addDays, daysBetween } from '@/utils/date'

export const SERVICE_DUE_STATUSES = [
  'unknown',
  'upcoming',
  'due_soon',
  'overdue',
  'blocking'
] as const
export type ServiceDueStatus = (typeof SERVICE_DUE_STATUSES)[number]

export interface ServiceThresholds {
  noticeKm: number
  noticeDays: number
  toleranceKm: number
  toleranceDays: number
}

export interface ServiceDue {
  nextKm: number | null
  nextDate: string | null
  kmRemaining: number | null
  daysRemaining: number | null
  status: ServiceDueStatus
}

/**
 * Where an operation stands for one vehicle: the first interval reached wins. An interval only counts
 * once its last passage is known, so a date alone never feeds a km interval. Past the tolerance the
 * service blocks the vehicle, unless the plan is provisional: its intervals are not confirmed yet.
 */
export function serviceDue(
  operation: { intervalKm: number | null; intervalDays: number | null },
  last: { km: number | null; date: string | null } | null,
  current: { km: number; today: string },
  thresholds: ServiceThresholds,
  provisional: boolean
): ServiceDue {
  const nextKm = operation.intervalKm && last?.km != null ? last.km + operation.intervalKm : null
  const nextDate =
    operation.intervalDays && last?.date ? addDays(last.date, operation.intervalDays) : null
  const kmRemaining = nextKm === null ? null : nextKm - current.km
  const daysRemaining = nextDate === null ? null : daysBetween(current.today, nextDate)
  return { nextKm, nextDate, kmRemaining, daysRemaining, status: dueStatus() }

  function dueStatus(): ServiceDueStatus {
    if (kmRemaining === null && daysRemaining === null) return 'unknown'
    const beyond =
      (kmRemaining !== null && -kmRemaining > thresholds.toleranceKm) ||
      (daysRemaining !== null && -daysRemaining > thresholds.toleranceDays)
    if (beyond && !provisional) return 'blocking'
    if ((kmRemaining ?? 0) < 0 || (daysRemaining ?? 0) < 0) return 'overdue'
    const soon =
      (kmRemaining !== null && kmRemaining <= thresholds.noticeKm) ||
      (daysRemaining !== null && daysRemaining <= thresholds.noticeDays)
    return soon ? 'due_soon' : 'upcoming'
  }
}

/** Worth a preventive order now: overdue, blocking, or within the notice. */
export function needsService(status: ServiceDueStatus): boolean {
  return status === 'due_soon' || status === 'overdue' || status === 'blocking'
}
