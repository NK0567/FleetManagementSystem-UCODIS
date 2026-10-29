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
  'telematics',
  'driverScore',
  'tyre',
  'service'
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

export interface AlertChannels {
  email: boolean
  sms: boolean
  emailTo: readonly string[]
  smsTo: readonly string[]
}

/**
 * What goes out when an alert is raised, besides the application: an e-mail or an SMS to each
 * address of its rule, at the moment the situation started.
 */
export function alertNotifications(
  channels: AlertChannels | null,
  since: string
): { channel: 'email' | 'sms'; to: string; sentAt: string }[] {
  if (!channels) return []
  return [
    ...(channels.email ? channels.emailTo.map((to) => ({ channel: 'email' as const, to })) : []),
    ...(channels.sms ? channels.smsTo.map((to) => ({ channel: 'sms' as const, to })) : [])
  ].map((item) => ({ ...item, sentAt: since }))
}

/**
 * Average time, in hours, from the moment a situation raised its alert to the moment someone
 * handled it; null while no alert has been handled.
 */
export function averageHandlingHours(
  alerts: readonly { since: string; handledAt: string | null }[]
): number | null {
  const delays = alerts
    .filter((alert) => alert.handledAt)
    .map(
      (alert) =>
        (new Date(alert.handledAt as string).getTime() - new Date(alert.since).getTime()) /
        3_600_000
    )
    .filter((hours) => hours >= 0)
  if (!delays.length) return null
  return Math.round((delays.reduce((total, hours) => total + hours, 0) / delays.length) * 10) / 10
}
