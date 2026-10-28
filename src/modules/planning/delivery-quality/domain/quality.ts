export const QUALITY_ACTORS = [
  'orderer',
  'logistics',
  'internal_carrier',
  'external_carrier'
] as const
export type QualityActor = (typeof QUALITY_ACTORS)[number]

export const QUALITY_ORIGINS = ['departure', 'transport', 'order'] as const
export type QualityOrigin = (typeof QUALITY_ORIGINS)[number]

export const QUALITY_IMPACTS = ['carrier_withholding', 'customer_credit'] as const
export type QualityImpact = (typeof QUALITY_IMPACTS)[number]

export const PROTEST_STATUSES = ['preparing', 'issued', 'closed'] as const
export type ProtestStatus = (typeof PROTEST_STATUSES)[number]

export const QUALITY_FACTS = [
  'loading_nonconformity',
  'refusal',
  'undelivered',
  'quantity_gap',
  'contestation',
  'return_nonconformity',
  'low_satisfaction',
  'protest'
] as const
export type QualityFact = (typeof QUALITY_FACTS)[number]

export interface ProtestNote {
  no: string
  reasonNo: string
  comment: string
  quantity: number
  preparedAt: string
  preparedBy: string
  issuedAt: string | null
  closedAt: string | null
  outcome: string
}

export interface ResponsibilityShare {
  actor: QualityActor
  percent: number
}

export interface ResponsibilityImpact {
  type: QualityImpact
  amount: number
}

export interface LineResponsibility {
  origin: QualityOrigin
  shares: ResponsibilityShare[]
  comment: string
  impacts: ResponsibilityImpact[]
  establishedAt: string
  establishedBy: string
}

export interface QualityFields {
  protests: ProtestNote[]
  responsibility: LineResponsibility | null
  creditReference: string | null
  creditIssuedAt: string | null
  creditIssuedBy: string | null
  customerInvoicedAt: string | null
  carrierInvoiceValidatedAt: string | null
  invoiceCustomerNo: string | null
  invoiceReference: string | null
  invoiceAmount: number | null
  invoiceFlatShare: number | null
  invoiceTariffNo: string | null
}

export function emptyQuality(): QualityFields {
  return {
    protests: [],
    responsibility: null,
    creditReference: null,
    creditIssuedAt: null,
    creditIssuedBy: null,
    customerInvoicedAt: null,
    carrierInvoiceValidatedAt: null,
    invoiceCustomerNo: null,
    invoiceReference: null,
    invoiceAmount: null,
    invoiceFlatShare: null,
    invoiceTariffNo: null
  }
}

export interface QualityLine {
  nonconformityAt: string | null
  refusalAt: string | null
  declaredAt: string | null
  returnedAt: string | null
  receivedQuantity: number | null
  quantity: number
  loadedQuantity: number | null
  quantityGap: number | null
  receptionContestedAt: string | null
  warehouseConforming: boolean | null
  satisfactionScore: number | null
  protests: readonly ProtestNote[]
}

/** Facts already recorded on the line. A responsibility needs at least one. */
export function qualityFacts(line: QualityLine): QualityFact[] {
  const facts: QualityFact[] = []
  if (line.nonconformityAt) facts.push('loading_nonconformity')
  if (line.refusalAt) facts.push('refusal')
  const reference = line.loadedQuantity ?? line.quantity
  if (line.receivedQuantity !== null && line.receivedQuantity < reference) facts.push('undelivered')
  if (line.quantityGap !== null && line.quantityGap !== 0) facts.push('quantity_gap')
  if (line.receptionContestedAt) facts.push('contestation')
  if (line.warehouseConforming === false) facts.push('return_nonconformity')
  if (line.satisfactionScore !== null && line.satisfactionScore <= 2) facts.push('low_satisfaction')
  if (line.protests.length > 0) facts.push('protest')
  return facts
}

export function protestStatus(note: Pick<ProtestNote, 'issuedAt' | 'closedAt'>): ProtestStatus {
  if (note.closedAt) return 'closed'
  if (note.issuedAt) return 'issued'
  return 'preparing'
}

/** A protest names a quantity that was actually loaded, or ordered when nothing was loaded. */
export function protestQuantityAllowed(quantity: number, reference: number): boolean {
  return quantity > 0 && quantity <= reference
}

/**
 * Follow-up stays open until the order is closed. A cancelled order keeps it
 * only for a line that was actually declared or refused.
 */
export function followUpOpen(
  order: { cancelled: boolean; closed: boolean },
  declared: boolean
): boolean {
  if (order.closed) return false
  if (!order.cancelled) return true
  return declared
}

/** Shares are frozen once the customer is invoiced or the carrier invoice is validated. */
export function responsibilityFrozen(
  line: Pick<QualityFields, 'customerInvoicedAt' | 'carrierInvoiceValidatedAt'>
): boolean {
  return line.customerInvoicedAt !== null || line.carrierInvoiceValidatedAt !== null
}

export type ShareIssue = 'duplicate' | 'externalMeans' | 'internalMeans' | 'percent' | 'total'

export function shareIssue(
  shares: readonly ResponsibilityShare[],
  means: 'fleet' | 'carrier' | null
): ShareIssue | null {
  if (new Set(shares.map((share) => share.actor)).size !== shares.length) return 'duplicate'
  if (shares.some((share) => share.actor === 'external_carrier') && means !== 'carrier')
    return 'externalMeans'
  if (shares.some((share) => share.actor === 'internal_carrier') && means !== 'fleet')
    return 'internalMeans'
  if (shares.some((share) => !Number.isFinite(share.percent) || share.percent <= 0))
    return 'percent'
  const total = shares.reduce((sum, share) => sum + share.percent, 0)
  if (Math.abs(total - 100) > 0.001) return 'total'
  return null
}

export function mainActor(shares: readonly ResponsibilityShare[]): QualityActor {
  return shares.reduce((main, share) => (share.percent > main.percent ? share : main)).actor
}

/** The carrier withholding is the customer credit times the carrier's share. */
export function withholdingOf(credit: number, externalPercent: number): number {
  return Math.round((credit * externalPercent) / 100)
}

export type ImpactIssue = 'duplicate' | 'amount' | 'withholding'

/**
 * A credit together with an external share replaces any typed withholding.
 * A withholding without that share is refused.
 */
export function settleImpacts(
  impacts: readonly ResponsibilityImpact[],
  externalPercent: number
): ResponsibilityImpact[] | ImpactIssue {
  if (new Set(impacts.map((impact) => impact.type)).size !== impacts.length) return 'duplicate'
  if (impacts.some((impact) => !Number.isFinite(impact.amount) || impact.amount <= 0))
    return 'amount'
  const credit = impacts.find((impact) => impact.type === 'customer_credit')?.amount ?? 0
  if (credit > 0 && externalPercent > 0) {
    return [
      ...impacts.filter((impact) => impact.type !== 'carrier_withholding'),
      { type: 'carrier_withholding', amount: withholdingOf(credit, externalPercent) }
    ]
  }
  if (impacts.some((impact) => impact.type === 'carrier_withholding') && externalPercent <= 0) {
    return 'withholding'
  }
  return [...impacts]
}
