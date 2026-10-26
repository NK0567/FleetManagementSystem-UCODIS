export const TOLERANCE_UNITS = ['percent', 'quantity'] as const
export type ToleranceUnit = (typeof TOLERANCE_UNITS)[number]

export interface QuantityToleranceApi {
  no: string
  customerNo: string | null
  productNo: string | null
  value: number
  unit: ToleranceUnit
  scopeLabel: string
  customerName: string
  productName: string
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type QuantityToleranceSearchColumn =
  | 'no'
  | 'customerName'
  | 'productName'
  | 'no,customerName,productName'
