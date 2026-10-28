export interface LoadingLineApi {
  orderNo: string
  lineNo: number
  productNo: string
  productName: string
  unit: string
  deliveryPointName: string
  recipientName: string
  quantity: number
  loadedQuantity: number | null
  conformingAt: string | null
}

export interface ReturnLineApi {
  orderNo: string
  lineNo: number
  productNo: string
  productName: string
  unit: string
  quantity: number
  recipientName: string
  deliveryPointName: string
  handedBackAt: string | null
}

export interface LoadedQuantity {
  lineNo: number
  loadedQuantity: number
}

export interface LoadingCheckResult {
  ready: boolean
  status: string
}

export type LoadingLineState = 'to_declare' | 'to_check' | 'conforming'

export interface ReasonChoice {
  reasonNo: string
  comment: string
}
