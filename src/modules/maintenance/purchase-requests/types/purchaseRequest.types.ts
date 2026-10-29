import type { PurchaseRequestStatus } from '../domain/purchaseRequest'

export interface PurchaseRequestApi {
  no: string
  /** Empty for a part that is not kept in stock. */
  itemNo: string | null
  label: string
  quantity: number
  estimatedAmount: number | null
  /** Empty when the purchase restocks the store rather than serving one order. */
  workOrderNo: string | null
  requestedAt: string
  requestedBy: string
  supplierNo: string | null
  orderNumber: string
  orderedAt: string | null
  orderedBy: string | null
  receivedAt: string | null
  receivedBy: string | null
  finalAmount: number | null
  cancelledAt: string | null
  cancelledBy: string | null
  cancelReason: string
  /** The purchase request as the ERP received it; the link with the ERP is simulated in the demo. */
  erpReference: string
  erpSentAt: string | null
  itemName: string
  supplierName: string
  vehiclePlate: string
  leadTimeDays: number | null
  status: PurchaseRequestStatus
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type PurchaseRequestSearchColumn = 'no' | 'label' | 'workOrderNo' | 'no,label,workOrderNo'
