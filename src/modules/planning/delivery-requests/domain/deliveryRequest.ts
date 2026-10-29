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

export interface RequestLineFacts {
  lineNo: number
  productNo: string
  quantity: number
  weightKg: number | null
  volumeM3: number | null
}

/** The lines of an order; an order stored before lines existed reads as one line. */
export function requestLines(row: {
  lines?: readonly RequestLineFacts[]
  productNo: string
  quantity: number
  weightKg: number | null
  volumeM3: number | null
}): RequestLineFacts[] {
  if (row.lines?.length) return row.lines.map((line) => ({ ...line }))
  const { productNo, quantity, weightKg, volumeM3 } = row
  return [{ lineNo: 1, productNo, quantity, weightKg, volumeM3 }]
}

/** First product and totals: a weight or a volume is known only when every line gives it. */
export function linesSummary(lines: readonly RequestLineFacts[]) {
  const total = (pick: (line: RequestLineFacts) => number | null) =>
    lines.some((line) => pick(line) === null)
      ? null
      : Math.round(lines.reduce((sum, line) => sum + (pick(line) ?? 0), 0) * 1000) / 1000
  return {
    productNo: lines[0]?.productNo ?? '',
    quantity: total((line) => line.quantity) ?? 0,
    weightKg: total((line) => line.weightKg),
    volumeM3: total((line) => line.volumeM3)
  }
}

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
