import type { PaginationMeta } from '@/types/api-response.types'
import type { ApiListFilter } from '@/core/utils/listFilters'
import { normalizeSearchText as normalizeText } from '@/utils/search'
import { COMMON_MESSAGES } from '../i18n'
import { badRequest } from './errors'

const DEFAULT_PAGE_SIZE = 25
const MAX_PAGE_SIZE = 500

type Row = Record<string, unknown>

function isListFilter(value: unknown): value is ApiListFilter {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.field === 'string' && 'value' in candidate
}

/** Filters arrive as the JSON string built by serializeListFiltersParam. */
export function parseFilters(raw: unknown): ApiListFilter[] {
  if (raw == null || raw === '') return []
  let parsed: unknown = raw
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw badRequest(COMMON_MESSAGES.invalidFilters)
    }
  }
  if (!Array.isArray(parsed) || !parsed.every(isListFilter)) {
    throw badRequest(COMMON_MESSAGES.invalidFilters)
  }
  return parsed
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Number(value)
  }
  return null
}

function toBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (value === 'true' || value === 1 || value === '1') return true
  if (value === 'false' || value === 0 || value === '0') return false
  return null
}

/** Negative when a < b, like a comparator; null values sort last. */
export function compareValues(a: unknown, b: unknown): number {
  const aMissing = a == null || a === ''
  const bMissing = b == null || b === ''
  if (aMissing || bMissing) return aMissing === bMissing ? 0 : aMissing ? 1 : -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b)
  return String(a).localeCompare(String(b), undefined, { sensitivity: 'base', numeric: true })
}

function likeToRegExp(pattern: string): RegExp {
  const escaped = normalizeText(pattern)
    .split('%')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')
  return new RegExp(`^${escaped}$`)
}

function equals(rowValue: unknown, filterValue: unknown, valueType: ApiListFilter['valueType']) {
  if (valueType === 'boolean') return toBoolean(rowValue) === toBoolean(filterValue)
  if (valueType === 'number') return toNumber(rowValue) === toNumber(filterValue)
  return normalizeText(rowValue) === normalizeText(filterValue)
}

export function matchesFilter(row: Row, filter: ApiListFilter): boolean {
  const rowValue = row[filter.field]
  const { value, valueType, operator = '=' } = filter

  // A row holding several values (regions of an order) matches when one of them does.
  if (Array.isArray(rowValue)) {
    const matched = rowValue.some((item) =>
      matchesFilter({ ...row, [filter.field]: item }, { ...filter, operator: '=' })
    )
    return operator === '<>' ? !matched : matched
  }
  if (Array.isArray(value)) {
    const included = value.some((candidate) => equals(rowValue, candidate, valueType))
    return operator === '<>' ? !included : included
  }
  if (rowValue == null || rowValue === '') return operator === '<>'

  switch (operator) {
    case '=':
      return equals(rowValue, value, valueType)
    case '<>':
      return !equals(rowValue, value, valueType)
    case 'LIKE':
      return likeToRegExp(String(value)).test(normalizeText(rowValue))
    default: {
      const order =
        valueType === 'number'
          ? (toNumber(rowValue) ?? 0) - (toNumber(value) ?? 0)
          : compareValues(rowValue, value)
      if (operator === '<') return order < 0
      if (operator === '<=') return order <= 0
      if (operator === '>') return order > 0
      return order >= 0
    }
  }
}

function matchesSearch(row: Row, query: string, columns: string[]): boolean {
  const needle = normalizeText(query)
  return columns.some((column) => normalizeText(row[column]).includes(needle))
}

function readColumns(raw: unknown, fallback: string[]): string[] {
  const columns = typeof raw === 'string' ? raw.split(',').map((column) => column.trim()) : []
  const valid = columns.filter(Boolean)
  return valid.length > 0 ? valid : fallback
}

export interface ListQueryOptions {
  /** Columns searched when the request names none. */
  searchColumns?: string[]
}

/** Search, filters and sort of a list request, without paging (also used by exports). */
export function filterAndSort<T extends object>(
  rows: T[],
  query: Record<string, unknown>,
  options: ListQueryOptions = {}
): T[] {
  const filters = parseFilters(query.filters)
  const searchQuery = typeof query.searchQuery === 'string' ? query.searchQuery.trim() : ''
  const searchColumns = readColumns(query.searchColumns, options.searchColumns ?? ['no'])

  const matching = rows.filter((row) => {
    const record = row as Row
    if (searchQuery && !matchesSearch(record, searchQuery, searchColumns)) return false
    return filters.every((filter) => matchesFilter(record, filter))
  })

  const sortBy = typeof query.sortBy === 'string' ? query.sortBy : ''
  if (!sortBy) return matching
  const direction = String(query.sortDirection).toUpperCase() === 'DESC' ? -1 : 1
  return [...matching].sort(
    (a, b) => direction * compareValues((a as Row)[sortBy], (b as Row)[sortBy])
  )
}

export function applyListQuery<T extends object>(
  rows: T[],
  query: Record<string, unknown>,
  options: ListQueryOptions = {}
): { items: T[]; meta: PaginationMeta } {
  const matching = filterAndSort(rows, query, options)
  const limit = Math.min(Math.max(toNumber(query.pageSize) ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE)
  const totalPages = Math.ceil(matching.length / limit)
  const page = Math.max(toNumber(query.page) ?? 1, 1)
  const start = (page - 1) * limit
  return {
    items: matching.slice(start, start + limit),
    meta: { total: matching.length, page, limit, totalPages }
  }
}
