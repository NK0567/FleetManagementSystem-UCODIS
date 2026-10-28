import { daysBetween } from '@/utils/date'

export const PERIOD_STATES = ['active', 'ended'] as const
export type PeriodState = (typeof PERIOD_STATES)[number]

export interface Period {
  startDate: string
  endDate: string | null
}

export function periodState(period: Period): PeriodState {
  return period.endDate ? 'ended' : 'active'
}

/** Days covered, both ends included; a running period counts up to today. */
export function periodDays(period: Period, today: string): number {
  return daysBetween(period.startDate, period.endDate ?? today) + 1
}

/** A new period may only start once every previous one has ended. */
export function latestEnd(periods: readonly Period[]): string | null {
  return periods.reduce<string | null>(
    (latest, period) =>
      period.endDate && (!latest || period.endDate > latest) ? period.endDate : latest,
    null
  )
}
