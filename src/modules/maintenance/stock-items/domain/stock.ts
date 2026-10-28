export const STOCK_STATUSES = ['available', 'low', 'out'] as const
export type StockStatus = (typeof STOCK_STATUSES)[number]

export const STOCK_MOVEMENT_KINDS = ['in', 'out', 'adjustment'] as const
export type StockMovementKind = (typeof STOCK_MOVEMENT_KINDS)[number]

/** The stock of an item is never typed in: it is the sum of its movements, so the ledger always replays. */
export function stockQuantity(movements: readonly { delta: number }[]): number {
  return movements.reduce((total, movement) => total + movement.delta, 0)
}

export function stockStatus(quantity: number, alertThreshold: number): StockStatus {
  if (quantity <= 0) return 'out'
  return quantity <= alertThreshold ? 'low' : 'available'
}
