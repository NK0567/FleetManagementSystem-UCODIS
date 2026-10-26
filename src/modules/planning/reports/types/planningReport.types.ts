/** Carrier indicators over the orders of the user perimeter. Rates are percentages. */
export interface CarrierReportRow {
  carrierNo: string
  carrierName: string | null
  orders: number
  punctuality: number | null
  confirmation: number | null
  contestation: number | null
  refusals: number
  invoices: number
  invoicesOutside: number
  withoutTariff: number
}

export interface PlanningDashboardApi {
  orders: number
  punctuality: number | null
  confirmation: number | null
  contestation: number | null
  lines: {
    declared: number
    attested: number
    contested: number
    onTime: number
    arrived: number
  }
  toInvoice: number
  toInvoiceAmount: number
  invoicesToCheck: number
  carriers: CarrierReportRow[]
}

/** Planned departure bounds; an empty bound does not filter. */
export interface ReportPeriod {
  from: string
  to: string
}
