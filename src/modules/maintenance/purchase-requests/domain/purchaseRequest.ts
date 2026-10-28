export const PURCHASE_REQUEST_STATUSES = ['requested', 'ordered', 'received', 'cancelled'] as const
export type PurchaseRequestStatus = (typeof PURCHASE_REQUEST_STATUSES)[number]

export function purchaseRequestStatus(request: {
  orderedAt: string | null
  receivedAt: string | null
  cancelledAt: string | null
}): PurchaseRequestStatus {
  if (request.cancelledAt) return 'cancelled'
  if (request.receivedAt) return 'received'
  return request.orderedAt ? 'ordered' : 'requested'
}

const DAY_MS = 86_400_000

/** Days from the order to the receipt, to the tenth: what a supplier really takes. */
export function leadTimeDays(orderedAt: string | null, receivedAt: string | null): number | null {
  if (!orderedAt || !receivedAt) return null
  const days = (new Date(receivedAt).getTime() - new Date(orderedAt).getTime()) / DAY_MS
  return Math.round(days * 10) / 10
}

/** Average lead time of a supplier over its received requests. */
export function averageLeadTime(leadTimes: readonly (number | null)[]): number | null {
  const known = leadTimes.filter((days): days is number => days !== null)
  if (!known.length) return null
  return Math.round((known.reduce((total, days) => total + days, 0) / known.length) * 10) / 10
}
