import { hourInWindow } from '@/modules/fleet/fuel-refills/domain/refill'
import { minutesBetween } from '@/utils/date'

export const CARD_STATUSES = ['active', 'blocked', 'expired'] as const
export type CardStatus = (typeof CARD_STATUSES)[number]

export const CARD_HOLDER_TYPES = ['vehicle', 'driver'] as const
export type CardHolderType = (typeof CARD_HOLDER_TYPES)[number]

export interface CardLimits {
  monthlyAmount: number | null
  monthlyVolumeL: number | null
  transactionsPerDay: number | null
  /** Cities where the card may be used; anywhere when empty. */
  zones: string[]
  startHour: number | null
  endHour: number | null
}

/** Card numbers are compared without their spaces. */
export function normalizeCardNumber(number: string): string {
  return number.replace(/\s+/g, '')
}

export function cardStatus(
  card: { blockedAt: string | null; expiresOn: string },
  today: string
): CardStatus {
  if (card.expiresOn < today) return 'expired'
  return card.blockedAt ? 'blocked' : 'active'
}

export const OVERRUN_CODES = [
  'expired',
  'blocked',
  'zone',
  'hours',
  'dailyCount',
  'monthlyAmount',
  'monthlyVolume'
] as const
export type OverrunCode = (typeof OVERRUN_CODES)[number]

export interface CardUse {
  no: string
  transactedAt: string
  city: string
  liters: number
  amount: number
}

/**
 * Limits a transaction broke. Daily and monthly totals count the transactions of the card up to
 * and including this one, so the first ones of a month stay within the caps.
 */
export function overruns(
  use: CardUse,
  card: { expiresOn: string; blockedAt: string | null; limits: CardLimits },
  history: readonly CardUse[]
): OverrunCode[] {
  const codes: OverrunCode[] = []
  const { limits } = card
  if (use.transactedAt.slice(0, 10) > card.expiresOn) codes.push('expired')
  if (card.blockedAt && use.transactedAt >= card.blockedAt.slice(0, 19)) codes.push('blocked')
  const city = use.city.trim().toLowerCase()
  if (limits.zones.length && !limits.zones.some((zone) => zone.trim().toLowerCase() === city)) {
    codes.push('zone')
  }
  if (
    limits.startHour !== null &&
    limits.endHour !== null &&
    !hourInWindow(Number(use.transactedAt.slice(11, 13)), limits.startHour, limits.endHour)
  ) {
    codes.push('hours')
  }
  const upToThis = history.filter((other) => other.transactedAt <= use.transactedAt)
  const sameDay = upToThis.filter(
    (other) => other.transactedAt.slice(0, 10) === use.transactedAt.slice(0, 10)
  )
  if (limits.transactionsPerDay !== null && sameDay.length > limits.transactionsPerDay) {
    codes.push('dailyCount')
  }
  const sameMonth = upToThis.filter(
    (other) => other.transactedAt.slice(0, 7) === use.transactedAt.slice(0, 7)
  )
  const amount = sameMonth.reduce((total, other) => total + other.amount, 0)
  const volume = sameMonth.reduce((total, other) => total + other.liters, 0)
  if (limits.monthlyAmount !== null && amount > limits.monthlyAmount) codes.push('monthlyAmount')
  if (limits.monthlyVolumeL !== null && volume > limits.monthlyVolumeL) codes.push('monthlyVolume')
  return codes
}

export interface RefillCandidate {
  no: string
  refueledAt: string
  liters: number
}

/** The refill closest in time within the tolerances, the closest volume breaking ties. */
export function closestRefill<T extends RefillCandidate>(
  use: Pick<CardUse, 'transactedAt' | 'liters'>,
  candidates: readonly T[],
  toleranceMin: number,
  tolerancePct: number
): T | null {
  const scored = candidates
    .map((refill) => ({
      refill,
      minutes: Math.abs(minutesBetween(use.transactedAt, refill.refueledAt)),
      volumePct: (Math.abs(refill.liters - use.liters) / use.liters) * 100
    }))
    .filter((item) => item.minutes <= toleranceMin && item.volumePct <= tolerancePct)
    .sort((a, b) => a.minutes - b.minutes || a.volumePct - b.volumePct)
  return scored[0]?.refill ?? null
}
