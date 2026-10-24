export const REPORT_KINDS = ['summary', 'fuel', 'drivers', 'audit'] as const
export type ReportKind = (typeof REPORT_KINDS)[number]

/** How a cell is shown; `measure` reads the unit of its row. */
export type ReportCellType =
  | 'text'
  | 'integer'
  | 'decimal'
  | 'percent'
  | 'amount'
  | 'date'
  | 'option'
  | 'indicator'
  | 'measure'

export interface ReportColumn {
  key: string
  type: ReportCellType
  optionsKey?: string
}

export type ReportCell = string | number | null

export interface ReportSection {
  key: string
  columns: ReportColumn[]
  rows: Record<string, ReportCell>[]
}

export interface FleetReportApi {
  kind: ReportKind
  from: string
  to: string
  siteNo: string | null
  siteName: string
  sections: ReportSection[]
}

export interface ReportFilters {
  from: string
  to: string
  siteNo: string | null
}
