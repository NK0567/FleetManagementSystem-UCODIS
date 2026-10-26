import type { BillIssue } from '../domain/billing'

/** A delivered order line, priced from the customer tariff or already invoiced. */
export interface BillRow {
  orderNo: string
  lineNo: number
  customerNo: string | null
  customerName: string | null
  deliveryPointNo: string
  deliveryPointName: string | null
  productNo: string
  productName: string | null
  unit: string | null
  quantity: number
  declaredAt: string | null
  amount: number | null
  tariffNo: string | null
  reference: string | null
  issue: BillIssue | null
}

export interface InvoiceResult {
  reference: string
  amount: number
  customerNo: string
}
