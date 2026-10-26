import { tacitlyConfirmed } from '@/modules/planning/customer-confirmations/domain/confirmation'

export interface ReceptionFacts {
  declaredAt: string | null
  receptionConfirmedAt: string | null
  receptionContestedAt: string | null
  refusalAt: string | null
  returnedAt: string | null
  receivedQuantity: number | null
  quantity: number
  loadedQuantity: number | null
  handedBackAt: string | null
  warehouseReceivedAt: string | null
  remainderAt: string | null
}

/** The loaded quantity is the reference. Before loading, the ordered quantity is. */
export function referenceQuantity(
  line: Pick<ReceptionFacts, 'quantity' | 'loadedQuantity'>
): number {
  return line.loadedQuantity ?? line.quantity
}

/**
 * A declared delivery is attested once the recipient confirms it, or once the tacit delay
 * has passed without a contestation. A contestation blocks the tacit confirmation.
 */
export function receptionAttested(
  line: Pick<ReceptionFacts, 'declaredAt' | 'receptionConfirmedAt' | 'receptionContestedAt'>,
  today: string,
  tacitDays: number | null
): boolean {
  if (!line.declaredAt || line.receptionContestedAt) return false
  if (line.receptionConfirmedAt) return true
  return tacitlyConfirmed(line.declaredAt, today, tacitDays)
}

/** What was not received, still to put back into the request pool. Once only. */
export function remainderQuantity(
  line: Pick<
    ReceptionFacts,
    'declaredAt' | 'receivedQuantity' | 'quantity' | 'loadedQuantity' | 'remainderAt'
  >
): number | null {
  if (!line.declaredAt || line.receivedQuantity === null || line.remainderAt) return null
  const left = referenceQuantity(line) - line.receivedQuantity
  return left > 0 ? left : null
}

/** Goods the tour brings back: a refusal, or a postponement that returns the load. */
export function returnExpected(line: Pick<ReceptionFacts, 'refusalAt' | 'returnedAt'>): boolean {
  return line.refusalAt !== null || line.returnedAt !== null
}

export function canHandBack(line: ReceptionFacts): boolean {
  return returnExpected(line) && !line.handedBackAt && !line.warehouseReceivedAt
}

export function canReceiveReturn(line: ReceptionFacts): boolean {
  return returnExpected(line) && !line.warehouseReceivedAt
}
