import type { StockMovementKind } from '@/modules/maintenance/stock-items/domain/stock'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

/** One line of the stock ledger, never edited: a mistake is corrected by an adjustment. */
export interface StockMovementRow extends MockRow {
  itemNo: string
  kind: StockMovementKind
  /** Signed: positive in, negative out. */
  delta: number
  /** The price the parts left or came in at, which is what an order is charged. */
  unitPrice: number
  at: string
  reason: string
  workOrderNo: string | null
  purchaseRequestNo: string | null
  recordedBy: string
}

const opening = (no: string, itemNo: string, delta: number, unitPrice: number) => ({
  no,
  itemNo,
  kind: 'in' as const,
  delta,
  unitPrice,
  at: '2026-07-01T09:00:00',
  reason: 'Stock initial',
  workOrderNo: null,
  purchaseRequestNo: null,
  recordedBy: 'MNT001'
})

const toOrder = (no: string, itemNo: string, quantity: number, unitPrice: number) => ({
  no,
  itemNo,
  kind: 'out' as const,
  delta: -quantity,
  unitPrice,
  at: '2026-08-18T08:00:00',
  reason: 'Entretien des 180 000 km',
  workOrderNo: 'OT-2026-0001',
  purchaseRequestNo: null,
  recordedBy: 'MNT001'
})

const SEED: Omit<StockMovementRow, keyof typeof seedAudit>[] = [
  opening('MVT-00001', 'FLT-HUI-HW', 15, 45_000),
  opening('MVT-00002', 'FLT-AIR-HW', 9, 68_000),
  opening('MVT-00003', 'FLT-GAZ-HW', 5, 52_000),
  opening('MVT-00004', 'CYL-FRN-STD', 2, 340_000),
  opening('MVT-00005', 'GRN-STD', 8, 65_000),
  opening('MVT-00006', 'BAT-12V-140', 3, 480_000),
  opening('MVT-00007', 'HUI-15W40', 24, 28_000),
  toOrder('MVT-00008', 'FLT-HUI-HW', 1, 45_000),
  toOrder('MVT-00009', 'FLT-GAZ-HW', 1, 52_000),
  toOrder('MVT-00010', 'HUI-15W40', 2, 28_000)
]

export const stockMovementsCollection: CollectionDefinition<StockMovementRow> = {
  name: 'stock-movements',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit })),
  dateFields: ['at']
}
