import type { ListFilter } from '@/core/types/crud.types'

export type PeriodListView = 'active' | 'ended' | 'all'

export function periodViewFilters(view: PeriodListView): ListFilter[] {
  return view === 'all' ? [] : [{ field: 'state', valueType: 'string', value: [view] }]
}

export function detectPeriodView(filters: ListFilter[]): PeriodListView {
  const value = JSON.stringify(filters.find((filter) => filter.field === 'state')?.value)
  if (value === JSON.stringify(['active'])) return 'active'
  if (value === JSON.stringify(['ended'])) return 'ended'
  return 'all'
}
