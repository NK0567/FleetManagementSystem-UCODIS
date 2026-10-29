import type { NotificationChannel } from '../types/customer.types'

export type CustomerIssue = 'noRole' | 'channelNeedsPhone' | 'channelNeedsEmail'

interface CustomerRules {
  isOrderer: boolean
  isRecipient: boolean
  phone: string
  email: string
  notificationChannel: NotificationChannel
}

/** A customer orders, receives or both; its notification channel needs the matching contact. */
export function customerIssues(customer: CustomerRules): CustomerIssue[] {
  const issues: CustomerIssue[] = []
  if (!customer.isOrderer && !customer.isRecipient) issues.push('noRole')
  const channel = customer.notificationChannel
  const byPhone = channel === 'sms' || channel === 'call' || channel === 'whatsapp'
  if (byPhone && !customer.phone.trim()) issues.push('channelNeedsPhone')
  if (channel === 'email' && !customer.email.trim()) issues.push('channelNeedsEmail')
  return issues
}
