import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { EMPTY_CELL, formatDate, formatDateTime, isIsoDateValue } from '@/utils/format'

/** Single display rule for list cells, shared by the table and the Excel export. */
export function getListCellDisplay(value: unknown, item: unknown, column: TableColumn): string {
  if (column.formatter) return column.formatter(value, item)
  if (value == null) return EMPTY_CELL
  if (typeof value === 'string') {
    const text = value.trim()
    if (!text) return EMPTY_CELL
    if (isIsoDateValue(text)) return text.length > 10 ? formatDateTime(text) : formatDate(text)
    return text
  }
  if (Array.isArray(value)) return value.length ? value.join(', ') : EMPTY_CELL
  return String(value)
}
