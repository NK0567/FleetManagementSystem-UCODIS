import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import type { ListFilter } from '@/core/types/crud.types'

export type FilterFieldMeta = {
  valueType: ListFilter['valueType']
  kind: FilterFieldDef['kind']
}

export type FilterFieldOverride = Partial<FilterFieldDef> &
  Pick<FilterFieldDef, 'valueType' | 'kind'>

/** Guesses the filter input from the field name; enumerations and references need an override. */
export function inferCommonFilterMeta(field: string): FilterFieldMeta {
  if (/^(is|has|can)[A-Z]/.test(field) || /(?:Active|Required|Enabled)$/.test(field)) {
    return { valueType: 'boolean', kind: 'boolean' }
  }
  if (/(?:Date|At)$/.test(field)) return { valueType: 'date', kind: 'date' }
  if (/(?:count|days|quantity|headcount|gap|hours|minutes|percent)$/i.test(field)) {
    return { valueType: 'number', kind: 'number' }
  }
  return { valueType: 'string', kind: 'text' }
}

export function overridesFromFilterDefs(
  defs: FilterFieldDef[]
): Record<string, FilterFieldOverride> {
  const overrides: Record<string, FilterFieldOverride> = {}
  for (const def of defs) {
    const override: FilterFieldOverride = { ...def }
    delete override.field
    delete override.label
    overrides[def.field] = override
  }
  return overrides
}

function mergeFilterField(
  field: string,
  label: string | undefined,
  inferred: FilterFieldMeta,
  override: FilterFieldOverride | undefined,
  base?: Partial<FilterFieldDef>
): FilterFieldDef {
  return {
    field,
    labelKey: base?.labelKey ?? override?.labelKey ?? field,
    label: base?.label ?? label,
    valueType: base?.valueType ?? override?.valueType ?? inferred.valueType,
    kind: base?.kind ?? override?.kind ?? inferred.kind,
    optionsKey: base?.optionsKey ?? override?.optionsKey,
    optionFilter: base?.optionFilter ?? override?.optionFilter,
    referenceKey: base?.referenceKey ?? override?.referenceKey
  }
}

/** Filter fields in column order, then the extra fields; overrides add options and references. */
export function buildFilterFieldsFromColumns(
  columns: TableColumn[],
  overrides: Record<string, FilterFieldOverride> = {},
  inferMeta: (field: string) => FilterFieldMeta = inferCommonFilterMeta,
  extraFields: FilterFieldDef[] = []
): FilterFieldDef[] {
  const seen = new Set<string>()
  const result: FilterFieldDef[] = []

  const add = (field: string, label: string | undefined, base?: FilterFieldDef) => {
    if (!field || seen.has(field)) return
    seen.add(field)
    result.push(mergeFilterField(field, label, inferMeta(field), overrides[field], base))
  }

  for (const column of columns) add((column.field ?? column.sortKey).trim(), column.label)
  for (const extra of extraFields) add(extra.field.trim(), extra.label, extra)

  return result
}
