export const CARRIER_INVOICE_STATUSES = ['to_check', 'validated', 'refused'] as const
export type CarrierInvoiceStatus = (typeof CARRIER_INVOICE_STATUSES)[number]

export function carrierInvoiceStatus(invoice: {
  validatedAt: string | null
  refusedAt: string | null
}): CarrierInvoiceStatus {
  if (invoice.refusedAt) return 'refused'
  if (invoice.validatedAt) return 'validated'
  return 'to_check'
}

export interface AgreedOrder {
  /** Net of withholdings. Null when no carrier tariff applies. */
  net: number | null
  withholding: number
}

/** The agreed total is the sum of the nets. One order without a tariff leaves the total unknown. */
export function agreedTotal(orders: readonly AgreedOrder[]): {
  total: number | null
  withholding: number
  untariffed: boolean
} {
  const withholding = orders.reduce((sum, order) => sum + order.withholding, 0)
  if (orders.some((order) => order.net === null))
    return { total: null, withholding, untariffed: true }
  return {
    total: orders.reduce((sum, order) => sum + (order.net ?? 0), 0),
    withholding,
    untariffed: false
  }
}

export type ValidateIssue = 'not_done' | 'outside' | 'reason'

/**
 * Within the tolerance the invoice matches the agreed amount and is frozen.
 * Without a tariff, only an explicit reason allows validation.
 */
export function validateIssue(input: {
  done: boolean
  untariffed: boolean
  amount: number
  agreed: number | null
  tolerance: number
  reason: string
}): ValidateIssue | null {
  if (!input.done) return 'not_done'
  if (input.untariffed || input.agreed === null) return input.reason.trim() ? null : 'reason'
  if (Math.abs(input.amount - input.agreed) > input.tolerance) return 'outside'
  return null
}
