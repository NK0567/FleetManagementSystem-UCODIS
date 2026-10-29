import { useI18n } from 'vue-i18n'
import { useOptionsStore } from '@/stores/optionsStore'
import { EMPTY_CELL, formatDate, formatNumber } from '@/utils/format'
import type {
  ReportCell,
  ReportColumn,
  ReportKind,
  ReportSection
} from '../types/fleetReport.types'

/** A report table ready for the screen and the exports, labels translated. */
export interface ReportTable {
  title: string
  headers: string[]
  numeric: boolean[]
  /** Text as shown; Excel keeps numbers as numbers. */
  rows: { text: string; value: string | number | null }[][]
}

const NUMERIC = new Set(['integer', 'decimal', 'percent', 'amount', 'measure'])
const DECIMAL_UNITS = new Set(['l100', 'years'])

const asNumber = (value: ReportCell) => (typeof value === 'number' ? value : null)

export function useReportFormat() {
  const { t } = useI18n()
  const optionsStore = useOptionsStore()

  function cellText(column: ReportColumn, row: Record<string, ReportCell>): string {
    const value = row[column.key] ?? null
    if (value === null || value === '') return EMPTY_CELL
    const number = asNumber(value)
    switch (column.type) {
      case 'integer':
      case 'amount':
        return formatNumber(number, 0)
      case 'decimal':
        return formatNumber(number, 1)
      case 'percent':
        return `${formatNumber(number, 1)} %`
      case 'date':
        return formatDate(String(value))
      case 'option':
        return optionsStore.getOptionLabel(column.optionsKey ?? '', value)
      case 'indicator':
        return t(`fleet.reports.indicator.${value}`)
      case 'measure': {
        const unit = String(row.unit ?? '')
        if (unit === 'percent') return `${formatNumber(number, 0)} %`
        const text = formatNumber(number, DECIMAL_UNITS.has(unit) ? 1 : 0)
        return unit === 'count' ? text : `${text} ${t(`fleet.reports.unit.${unit}`)}`
      }
      default:
        return String(value)
    }
  }

  function toTable(kind: ReportKind, section: ReportSection): ReportTable {
    return {
      title: t(`fleet.reports.section.${kind}.${section.key}`),
      headers: section.columns.map((column) => t(`fleet.reports.col.${column.key}`)),
      numeric: section.columns.map((column) => NUMERIC.has(column.type)),
      rows: section.rows.map((row) =>
        section.columns.map((column) => {
          const text = cellText(column, row)
          const raw = row[column.key] ?? null
          const keepsNumber = NUMERIC.has(column.type) && typeof raw === 'number'
          return { text, value: keepsNumber ? raw : text === EMPTY_CELL ? null : text }
        })
      )
    }
  }

  return { toTable }
}
