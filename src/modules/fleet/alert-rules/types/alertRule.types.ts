export const ALERT_RULE_SEVERITIES = ['by_case', 'info', 'warning', 'critical'] as const
/** The severity a rule gives its alerts; by_case keeps the severity of each situation. */
export type AlertRuleSeverity = (typeof ALERT_RULE_SEVERITIES)[number]

export interface AlertRuleApi {
  /** The event the rule is about: one category of alert. */
  no: string
  name: string
  recipients: string[]
  escalationHours: number
  escalateTo: string
  active: boolean
  severity: AlertRuleSeverity
  /** The application always shows the alert; e-mail and SMS are sent on top. */
  email: boolean
  sms: boolean
  emailTo: string[]
  smsTo: string[]
  /** When the event raises an alert, read where that threshold is set. */
  threshold: string
  /** The screen where the threshold is set; empty when the event has no threshold. */
  thresholdPath: string
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type AlertRuleSearchColumn = 'no' | 'name' | 'no,name'
