import type { ListFilter, ListFilterOperator } from '@/core/types/crud.types'

export function isListFilterValueEmpty(value: unknown): boolean {
  if (value == null) return true
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'string') return value.trim() === ''
  if (typeof value === 'number') return Number.isNaN(value)
  return false
}

export function getAppliedListFilters(filters: ListFilter[]): ListFilter[] {
  return filters.filter((filter) => !isListFilterValueEmpty(filter.value))
}

export interface ApiListFilter {
  field: string
  valueType: ListFilter['valueType']
  value: unknown
  operator?: Exclude<ListFilterOperator, 'STARTS' | 'ENDS'>
}

function wrapLikeValue(value: unknown, mode: 'contains' | 'starts' | 'ends'): unknown {
  if (typeof value !== 'string') return value
  if (mode === 'starts') return `${value}%`
  if (mode === 'ends') return `%${value}`
  return `%${value}%`
}

/** Maps a UI filter (with STARTS / ENDS) to the API contract, which only knows SQL operators. */
export function toApiListFilter(filter: ListFilter): ApiListFilter {
  const { field, valueType, value, operator } = filter
  const base: ApiListFilter = { field, valueType, value }

  switch (operator) {
    case undefined:
    case '=':
      return base
    case 'LIKE':
      return { ...base, operator: 'LIKE', value: wrapLikeValue(value, 'contains') }
    case 'STARTS':
      return { ...base, operator: 'LIKE', value: wrapLikeValue(value, 'starts') }
    case 'ENDS':
      return { ...base, operator: 'LIKE', value: wrapLikeValue(value, 'ends') }
    default:
      return { ...base, operator }
  }
}

export function serializeListFiltersParam(filters: unknown): string | undefined {
  if (!Array.isArray(filters) || filters.length === 0) return undefined
  const applied = getAppliedListFilters(filters as ListFilter[]).map(toApiListFilter)
  return applied.length > 0 ? JSON.stringify(applied) : undefined
}
