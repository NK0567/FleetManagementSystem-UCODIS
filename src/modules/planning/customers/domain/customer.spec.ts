import { describe, expect, it } from 'vitest'
import { customerIssues } from './customer'

const base = {
  isOrderer: false,
  isRecipient: true,
  phone: '034 00 000 00',
  email: '',
  notificationChannel: 'sms' as const
}

describe('customerIssues', () => {
  it('needs at least one role', () => {
    expect(customerIssues({ ...base, isRecipient: false })).toEqual(['noRole'])
  })

  it('needs the contact the channel uses', () => {
    expect(customerIssues(base)).toEqual([])
    expect(customerIssues({ ...base, phone: '', notificationChannel: 'whatsapp' })).toEqual([
      'channelNeedsPhone'
    ])
    expect(customerIssues({ ...base, phone: '', notificationChannel: 'call' })).toEqual([
      'channelNeedsPhone'
    ])
    expect(customerIssues({ ...base, phone: '', notificationChannel: 'none' })).toEqual([])
    expect(customerIssues({ ...base, phone: ' ', notificationChannel: 'email' })).toEqual([
      'channelNeedsEmail'
    ])
    expect(customerIssues({ ...base, phone: '' })).toEqual(['channelNeedsPhone'])
  })
})
