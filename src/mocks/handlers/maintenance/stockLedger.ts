import { stockQuantity } from '@/modules/maintenance/stock-items/domain/stock'
import { nowIsoDateTime } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { StockMovementRow } from '../../fixtures/maintenance/stockMovements'
import { stampCreated } from '../../http/crudResource'
import { unprocessable } from '../../http/errors'
import { sessionUser, type MockRequest } from '../../http/types'
import { MAINTENANCE_MESSAGES } from './messages'

export function stockQuantities(db: MockDatabase): Map<string, number> {
  const byItem = new Map<string, { delta: number }[]>()
  for (const movement of db.stockMovements.all()) {
    byItem.set(movement.itemNo, [...(byItem.get(movement.itemNo) ?? []), movement])
  }
  return new Map([...byItem].map(([itemNo, movements]) => [itemNo, stockQuantity(movements)]))
}

/** The one way stock changes: every in, out and adjustment leaves a line in the ledger. */
export function addMovement(
  db: MockDatabase,
  movement: Pick<
    StockMovementRow,
    'itemNo' | 'kind' | 'delta' | 'unitPrice' | 'reason' | 'workOrderNo' | 'purchaseRequestNo'
  > & { at?: string },
  request: MockRequest
): StockMovementRow {
  const available = stockQuantities(db).get(movement.itemNo) ?? 0
  if (available + movement.delta < 0) {
    throw unprocessable(MAINTENANCE_MESSAGES.stockInsufficient, { available })
  }
  return db.stockMovements.insert(
    stampCreated(
      {
        ...movement,
        no: nextNo(
          db.stockMovements.all().map((row) => row.no),
          'MVT-',
          5
        ),
        at: movement.at ?? nowIsoDateTime(),
        recordedBy: sessionUser(request).code
      },
      request
    )
  )
}
