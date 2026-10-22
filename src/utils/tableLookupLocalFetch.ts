import type {
  FetchFnParams,
  FetchFnResult
} from '@/components/ui/table-lookup/TableLookupModal.vue'

type AnyItem = Record<string, unknown>

export function filterLocalItems(
  items: AnyItem[],
  searchQuery: string | undefined,
  keys: string[],
  searchColumn?: string
): AnyItem[] {
  const q = searchQuery?.trim().toLowerCase()
  if (!q) return items
  const searchKeys = searchColumn?.trim() ? [searchColumn.trim()] : keys
  return items.filter((item) =>
    searchKeys.some((key) =>
      String(item[key] ?? '')
        .toLowerCase()
        .includes(q)
    )
  )
}

export function sortLocalItems(
  items: AnyItem[],
  sortBy?: string,
  sortDirection: 'ASC' | 'DESC' = 'ASC'
): AnyItem[] {
  if (!sortBy) return items
  const dir = sortDirection === 'DESC' ? -1 : 1
  return [...items].sort((a, b) => {
    const va = a[sortBy]
    const vb = b[sortBy]
    if (va == null && vb == null) return 0
    if (va == null) return -1 * dir
    if (vb == null) return 1 * dir
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
    return String(va).localeCompare(String(vb), undefined, { sensitivity: 'base' }) * dir
  })
}

export function paginateLocalItems(items: AnyItem[], params: FetchFnParams): FetchFnResult {
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / params.pageSize))
  const page = Math.min(Math.max(1, params.page), totalPages)
  const start = (page - 1) * params.pageSize
  return {
    items: items.slice(start, start + params.pageSize),
    meta: { total, page, totalPages }
  }
}

export function fetchPaginatedLocal(
  items: AnyItem[],
  params: FetchFnParams,
  searchKeys: string[]
): FetchFnResult {
  const filtered = sortLocalItems(
    filterLocalItems(items, params.searchQuery, searchKeys, params.searchColumn),
    params.sortBy,
    params.sortDirection
  )
  return paginateLocalItems(filtered, params)
}

export function dedupeLocalItems(items: AnyItem[], key: string): AnyItem[] {
  const seen = new Set<string>()
  const result: AnyItem[] = []
  for (const item of items) {
    const value = String(item[key] ?? '').trim()
    if (!value || seen.has(value)) continue
    seen.add(value)
    result.push(item)
  }
  return result
}
