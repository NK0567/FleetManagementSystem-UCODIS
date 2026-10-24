import type { UserProfileCode } from '@/types/auth.types'

export const ALERT_CATEGORIES = [
  'document',
  'companyDocument',
  'checklist',
  'infraction',
  'training',
  'departure',
  'equipment',
  'inspection',
  'deviation',
  'insurance',
  'telematics'
] as const
export type AlertCategory = (typeof ALERT_CATEGORIES)[number]

export const ALERT_SEVERITIES = ['info', 'warning', 'critical'] as const
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number]

export const ALERT_STATUSES = ['new', 'acknowledged', 'handled', 'resolved'] as const
export type AlertStatus = (typeof ALERT_STATUSES)[number]

/** What someone did with an alert, kept under the stable key of its signal. */
export interface AlertHandling {
  acknowledgedBy: string | null
  acknowledgedAt: string | null
  handledBy: string | null
  handledAt: string | null
  comment: string
}

/** A signal that went away is resolved, whatever was done with it. */
export function alertStatus(signalPresent: boolean, handling: AlertHandling | null): AlertStatus {
  if (!signalPresent) return 'resolved'
  if (handling?.handledAt) return 'handled'
  if (handling?.acknowledgedAt) return 'acknowledged'
  return 'new'
}

/** An alert left new past the delay of its rule goes up to the escalation profile. */
export function isEscalated(
  status: AlertStatus,
  since: string,
  escalationHours: number,
  now: Date
): boolean {
  if (status !== 'new') return false
  return now.getTime() - new Date(since).getTime() >= escalationHours * 3_600_000
}

export interface AlertAudience {
  recipients: readonly string[]
  escalateTo: string | null
}

export function isVisibleTo(
  profile: UserProfileCode,
  audience: AlertAudience,
  escalated: boolean
): boolean {
  if (profile === 'ADMIN') return true
  if (audience.recipients.includes(profile)) return true
  return escalated && audience.escalateTo === profile
}
