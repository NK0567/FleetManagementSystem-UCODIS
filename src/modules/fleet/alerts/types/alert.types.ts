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
}

export type AlertSearchColumn = 'subject' | 'detail' | 'subject,detail'
