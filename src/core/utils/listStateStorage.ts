import type { ListFilter } from '@/core/types/crud.types'

export const LIST_STATE_STORAGE_PREFIX = 'list_state_'

export interface PersistedListState {
  userFilters: ListFilter[]
  filterPanelOpen: boolean
}

function storageKey(persistKey: string): string {
  return LIST_STATE_STORAGE_PREFIX + persistKey
}

function isListFilter(value: unknown): value is ListFilter {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return typeof row.field === 'string' && typeof row.valueType === 'string'
}

// Storage access can throw (private mode, quota): list state is a convenience, never a blocker.
export function loadPersistedListState(persistKey: string): PersistedListState | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(storageKey(persistKey))
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    const data = parsed as Record<string, unknown>
    return {
      userFilters: Array.isArray(data.userFilters) ? data.userFilters.filter(isListFilter) : [],
      filterPanelOpen: Boolean(data.filterPanelOpen)
    }
  } catch {
    return null
  }
}

export function savePersistedListState(persistKey: string, state: PersistedListState): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(storageKey(persistKey), JSON.stringify(state))
  } catch {
    return
  }
}

export function clearPersistedListState(persistKey: string): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.removeItem(storageKey(persistKey))
  } catch {
    return
  }
}

export function clearAllPersistedListStates(): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    const keys: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key?.startsWith(LIST_STATE_STORAGE_PREFIX)) keys.push(key)
    }
    for (const key of keys) sessionStorage.removeItem(key)
  } catch {
    return
  }
}
