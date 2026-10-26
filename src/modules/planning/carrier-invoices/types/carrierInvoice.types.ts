import type { CarrierInvoiceStatus } from '../domain/carrierInvoice'

export interface CarrierInvoiceApi {
  no: string
  carrierNo: string
  carrierName: string | null
  reference: string
  invoiceDate: string
  amount: number
  orderNos: string[]
  /** Sum of the order nets, withholdings deducted. Null when an order has no tariff. */
  agreedAmount: number | null
  withholdingAmount: number | null
  untariffed: boolean
  untariffedReason: string
  status: CarrierInvoiceStatus
  validatedAt: string | null
  refusedAt: string | null
  refusalReason: string
}

export interface CarrierInvoiceInput {
  carrierNo: string
  reference: string
  date: string
  amount: number
  orderNos: string[]
}
