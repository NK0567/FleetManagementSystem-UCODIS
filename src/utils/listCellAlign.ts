import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'

/** Codes such as "UCT-012" or a column ending in "No" are identifiers, never quantities. */
export function isCodeOrIdentifierColumn(column: TableColumn): boolean {
  const key = String(column.field ?? column.sortKey ?? '').trim()
  return /^(no|code)$/i.test(key) || /(No|Code)$/.test(key)
}

export function shouldRightAlignNumeric(value: unknown, column: TableColumn): boolean {
  if (column.align) return column.align === 'right'
  if (isCodeOrIdentifierColumn(column)) return false
  return typeof value === 'number' && Number.isFinite(value)
}
