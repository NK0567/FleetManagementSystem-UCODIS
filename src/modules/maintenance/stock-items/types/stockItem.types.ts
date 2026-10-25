import type { StockMovementKind, StockStatus } from '../domain/stock'

export interface StockItemApi {
  no: string
  name: string
  subsystemNo: string
  supplierNo: string | null
  unitPrice: number
  alertThreshold: number
  active: boolean
  subsystemName: string
  supplierName: string
  stockQuantity: number
  stockValue: number
  status: StockStatus
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type StockItemSearchColumn = 'no' | 'name' | 'no,name'

export interface StockMovementApi {
  no: string
  itemNo: string
  itemName: string
  kind: StockMovementKind
  delta: number
  quantity: number
  unitPrice: number
  value: number
  at: string
  reason: string
  workOrderNo: string | null
  purchaseRequestNo: string | null
  vehiclePlate: string
  recordedBy: string
}
