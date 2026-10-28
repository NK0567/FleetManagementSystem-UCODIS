import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'

/** Export columns: every list column, then the filterable fields not already covered. */
export function buildListExportColumns(
  tableColumns: TableColumn[],
  filterFields: FilterFieldDef[],
  t: (key: string) => string
): TableColumn[] {
  const seen = new Set<string>()
  const result: TableColumn[] = []

  for (const column of tableColumns) {
    const key = (column.field ?? column.sortKey).trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(column)
  }

  for (const field of filterFields) {
    const key = field.field.trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push({
      sortKey: key,
      field: key,
      label: field.label ?? t(field.labelKey),
      minW: '100px'
    })
  }

  return result
}
