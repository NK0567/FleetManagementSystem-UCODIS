import type { AlertCategory, AlertHandling, AlertSeverity, AlertStatus } from '../domain/alert'

export interface AlertApi extends AlertHandling {
  /** Stable key of the signal: category and record, never its state. */
  no: string
  category: AlertCategory
  severity: AlertSeverity
  subject: string
  detail: string
  since: string
  /** Screen of the record behind the alert. */
  path: string
  recordNo: string
  status: AlertStatus
  escalated: boolean
  escalateTo: string | null
  /** E-mails and SMS sent for the alert to the addresses of its rule (simulated in the mock-up). */
  notifications: AlertNotification[]
}

export interface AlertNotification {
  channel: 'email' | 'sms'
  to: string
  sentAt: string
}

export type AlertSearchColumn = 'subject' | 'detail' | 'subject,detail'

/** A request waiting for the user's decision, shown in the bell with the alerts. */
export interface InboxRequest {
  kind: 'leave' | 'companyDocument' | 'departure'
  no: string
  subject: string
  since: string
  /** Screen where the request is decided. */
  path: string
}

/** What the bell of the top bar gathers for the user: open alerts and requests to decide. */
export interface InboxApi {
  alertCount: number
  /** Open alerts, newest situations first, limited to the first ones. */
  alerts: AlertApi[]
  requestCount: number
  requests: InboxRequest[]
}
