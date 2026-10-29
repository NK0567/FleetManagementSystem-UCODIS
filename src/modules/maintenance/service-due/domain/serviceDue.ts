import { addDays, daysBetween } from '@/utils/date'

export const SERVICE_DUE_STATUSES = [
  'unknown',
  'upcoming',
  'due_soon',
  'overdue',
  'blocking'
] as const
export type ServiceDueStatus = (typeof SERVICE_DUE_STATUSES)[number]

/** How early a service becomes due soon, on each of its counters. */
export interface ServiceThresholds {
  noticeKm: number
  noticeDays: number
  noticeHours: number
}

export interface ServiceDue {
  nextKm: number | null
  nextHours: number | null
  nextDate: string | null
  kmRemaining: number | null
  hoursRemaining: number | null
  daysRemaining: number | null
  status: ServiceDueStatus
}

export interface ServiceIntervals {
  intervalKm: number | null
  intervalHours?: number | null
  intervalDays: number | null
}

export interface ServicePassage {
  km: number | null
  hours?: number | null
  date: string | null
}

/**
 * Where an operation stands for one vehicle: the first threshold reached wins, in km, engine hours
 * or time. An interval only counts once its last passage is known, so a date alone never feeds a
 * km interval. Once past due, the service makes the vehicle unavailable, unless the plan is still
 * provisional: its intervals are not confirmed yet, the service is then only overdue.
 */
export function serviceDue(
  operation: ServiceIntervals,
  last: ServicePassage | null,
  current: { km: number; today: string; hours?: number | null },
  thresholds: ServiceThresholds,
  provisional: boolean
): ServiceDue {
  const nextKm = operation.intervalKm && last?.km != null ? last.km + operation.intervalKm : null
  const nextHours =
    operation.intervalHours && last?.hours != null ? last.hours + operation.intervalHours : null
  const nextDate =
    operation.intervalDays && last?.date ? addDays(last.date, operation.intervalDays) : null
  const kmRemaining = nextKm === null ? null : nextKm - current.km
  const hoursRemaining =
    nextHours === null || current.hours == null ? null : nextHours - current.hours
  const daysRemaining = nextDate === null ? null : daysBetween(current.today, nextDate)
  return {
    nextKm,
    nextHours,
    nextDate,
    kmRemaining,
    hoursRemaining,
    daysRemaining,
    status: dueStatus()
  }

  function dueStatus(): ServiceDueStatus {
    const counters = [
      { remaining: kmRemaining, notice: thresholds.noticeKm },
      { remaining: hoursRemaining, notice: thresholds.noticeHours },
      { remaining: daysRemaining, notice: thresholds.noticeDays }
    ].filter(
      (counter): counter is { remaining: number; notice: number } => counter.remaining !== null
    )
    if (!counters.length) return 'unknown'
    if (counters.some((counter) => counter.remaining < 0))
      return provisional ? 'overdue' : 'blocking'
    return counters.some((counter) => counter.remaining <= counter.notice) ? 'due_soon' : 'upcoming'
  }
}

/** Worth a preventive order now: overdue, blocking, or within the notice. */
export function needsService(status: ServiceDueStatus): boolean {
  return status === 'due_soon' || status === 'overdue' || status === 'blocking'
}
