import type { ListFilterOperator } from '@/core/types/crud.types'

export type FilterOperatorFieldKind =
  | 'text'
  | 'number'
  | 'date'
  | 'boolean'
  | 'option'
  | 'reference'

export interface FilterOperatorOption {
  value: ListFilterOperator
  symbol: string
  labelKey: string
}

const EQ: FilterOperatorOption = { value: '=', symbol: '=', labelKey: 'common.filterOp.eq' }
const NE: FilterOperatorOption = { value: '<>', symbol: '<>', labelKey: 'common.filterOp.ne' }
const LT: FilterOperatorOption = { value: '<', symbol: '<', labelKey: 'common.filterOp.lt' }
const LTE: FilterOperatorOption = { value: '<=', symbol: '<=', labelKey: 'common.filterOp.lte' }
const GT: FilterOperatorOption = { value: '>', symbol: '>', labelKey: 'common.filterOp.gt' }
const GTE: FilterOperatorOption = { value: '>=', symbol: '>=', labelKey: 'common.filterOp.gte' }
const CONTAINS: FilterOperatorOption = {
  value: 'LIKE',
  symbol: '*..*',
  labelKey: 'common.filterOp.contains'
}
const STARTS: FilterOperatorOption = {
  value: 'STARTS',
  symbol: '..*',
  labelKey: 'common.filterOp.startsWith'
}
const ENDS: FilterOperatorOption = {
  value: 'ENDS',
  symbol: '*..',
  labelKey: 'common.filterOp.endsWith'
}

const COMPARE = [EQ, NE, LT, LTE, GT, GTE]
const TEXT = [EQ, NE, CONTAINS, STARTS, ENDS, LT, LTE, GT, GTE]
const BOOLEAN = [EQ, NE]

/** Multi-select option filters are sent as IN, so they offer no operator. */
export function operatorsForKind(kind: FilterOperatorFieldKind): FilterOperatorOption[] {
  switch (kind) {
    case 'option':
      return []
    case 'boolean':
      return BOOLEAN
    case 'number':
    case 'date':
      return COMPARE
    default:
      return TEXT
  }
}

export function defaultOperatorForKind(
  kind: FilterOperatorFieldKind
): ListFilterOperator | undefined {
  return kind === 'option' ? undefined : '='
}

export function allowsMultipleFilters(kind: FilterOperatorFieldKind): boolean {
  return kind === 'date' || kind === 'number'
}

/** For dates and numbers, the first line opens a range (>=) and the next one closes it (<=). */
export function operatorWhenAddingFilter(
  kind: FilterOperatorFieldKind,
  existingOperators: Array<ListFilterOperator | undefined>
): ListFilterOperator | undefined {
  if (!allowsMultipleFilters(kind)) return defaultOperatorForKind(kind)
  if (existingOperators.length === 0) return '>='
  const hasLowerBound = existingOperators.some((op) => op === '>=' || op === '>')
  return hasLowerBound ? '<=' : '>='
}
