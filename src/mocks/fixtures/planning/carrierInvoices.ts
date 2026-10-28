import type { CollectionDefinition, MockRow } from '../../db/collection'

export interface CarrierInvoiceRow extends MockRow {
  carrierNo: string
  reference: string
  invoiceDate: string
  amount: number
  orderNos: string[]
  agreedAmount: number | null
  withholdingAmount: number | null
  untariffedReason: string
  validatedAt: string | null
  validatedBy: string | null
  refusedAt: string | null
  refusedBy: string | null
  refusalReason: string
}

export const carrierInvoicesCollection: CollectionDefinition<CarrierInvoiceRow> = {
  name: 'carrier-invoices',
  seed: () => []
}
