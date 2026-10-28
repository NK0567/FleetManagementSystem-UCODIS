import type { PurchaseRequestApi } from '@/modules/maintenance/purchase-requests/types/purchaseRequest.types'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export type PurchaseRequestRow = MockRow &
  Pick<
    PurchaseRequestApi,
    | 'itemNo'
    | 'label'
    | 'quantity'
    | 'estimatedAmount'
    | 'workOrderNo'
    | 'requestedAt'
    | 'requestedBy'
    | 'supplierNo'
    | 'orderNumber'
    | 'orderedAt'
    | 'orderedBy'
    | 'receivedAt'
    | 'receivedBy'
    | 'finalAmount'
    | 'cancelledAt'
    | 'cancelledBy'
    | 'cancelReason'
  >

const SEED: Omit<PurchaseRequestRow, keyof typeof seedAudit>[] = [
  {
    no: 'DA-2026-0001',
    itemNo: 'BV-FOT-EST',
    label: 'Boîte de vitesses complète Foton Auman',
    quantity: 1,
    estimatedAmount: 3_200_000,
    workOrderNo: null,
    requestedAt: '2026-08-19T10:00:00',
    requestedBy: 'MNT001',
    supplierNo: 'PRS-006',
    orderNumber: 'BC-2026-0088',
    orderedAt: '2026-08-20T09:00:00',
    orderedBy: 'FLT001',
    receivedAt: null,
    receivedBy: null,
    finalAmount: null,
    cancelledAt: null,
    cancelledBy: null,
    cancelReason: ''
  },
  {
    no: 'DA-2026-0002',
    itemNo: null,
    label: "Raccord rapide du circuit d'air",
    quantity: 1,
    estimatedAmount: 30_000,
    workOrderNo: 'OT-2026-0002',
    requestedAt: '2026-08-27T11:30:00',
    requestedBy: 'MNT001',
    supplierNo: 'PRS-014',
    orderNumber: 'BC-2026-0091',
    orderedAt: '2026-08-27T14:00:00',
    orderedBy: 'FLT001',
    receivedAt: '2026-08-28T16:00:00',
    receivedBy: 'MNT001',
    finalAmount: 35_000,
    cancelledAt: null,
    cancelledBy: null,
    cancelReason: ''
  }
]

export const purchaseRequestsCollection: CollectionDefinition<PurchaseRequestRow> = {
  name: 'purchase-requests',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit })),
  dateFields: ['requestedAt', 'orderedAt', 'receivedAt', 'cancelledAt']
}
