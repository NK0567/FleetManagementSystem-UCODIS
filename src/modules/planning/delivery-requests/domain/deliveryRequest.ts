export const DELIVERY_REQUEST_STATUSES = [
  'pending',
  'planned',
  'expired',
  'rejected',
  'cancelled'
] as const
export type DeliveryRequestStatus = (typeof DELIVERY_REQUEST_STATUSES)[number]

interface StatusFacts {
  cancelledAt: string | null
  rejectedAt: string | null
  transportOrderNo: string | null
  validUntil: string | null
}

/** Read from the facts, never stored: a request past its validity expires on its own. */
export function deliveryRequestStatus(request: StatusFacts, today: string): DeliveryRequestStatus {
  if (request.cancelledAt) return 'cancelled'
  if (request.transportOrderNo) return 'planned'
  if (request.rejectedAt) return 'rejected'
  if (request.validUntil && request.validUntil < today) return 'expired'
  return 'pending'
}

/** A request is corrected until a transport order takes it; correcting a rejected one resubmits it. */
export const isEditable = (status: DeliveryRequestStatus) =>
  status === 'pending' || status === 'rejected' || status === 'expired'

export const canReject = (status: DeliveryRequestStatus) =>
  status === 'pending' || status === 'expired'

export const canCancel = (status: DeliveryRequestStatus) => isEditable(status)

export type DeliveryRequestIssue = 'desiredDateInPast' | 'validityBeforeDesiredDate'

export function deliveryRequestIssues(
  request: { desiredDate: string; validUntil: string | null },
  today: string
): DeliveryRequestIssue[] {
  const issues: DeliveryRequestIssue[] = []
  if (request.desiredDate < today) issues.push('desiredDateInPast')
  if (request.validUntil && request.validUntil < request.desiredDate) {
    issues.push('validityBeforeDesiredDate')
  }
  return issues
}
