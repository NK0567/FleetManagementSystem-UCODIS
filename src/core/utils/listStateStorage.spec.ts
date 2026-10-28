import { describe, it, expect, beforeEach } from 'vitest'
import {
  clearAllPersistedListStates,
  clearPersistedListState,
  LIST_STATE_STORAGE_PREFIX,
  loadPersistedListState,
  savePersistedListState
} from './listStateStorage'

describe('listStateStorage', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('round-trips user filters and panel state', () => {
    const state = {
      userFilters: [
        {
          field: 'city',
          valueType: 'string' as const,
          value: 'Toamasina',
          operator: 'LIKE' as const
        }
      ],
      filterPanelOpen: true
    }
    savePersistedListState('hr-employee', state)

    expect(loadPersistedListState('hr-employee')).toEqual(state)
  })

  it('drops invalid entries from stored filters', () => {
    sessionStorage.setItem(
      LIST_STATE_STORAGE_PREFIX + 'x',
      JSON.stringify({
        userFilters: [{ field: 'ok', valueType: 'string', value: 1 }, { bad: true }, null],
        filterPanelOpen: false
      })
    )

    expect(loadPersistedListState('x')?.userFilters).toEqual([
      { field: 'ok', valueType: 'string', value: 1 }
    ])
  })

  it('clearAllPersistedListStates only removes list state keys', () => {
    savePersistedListState('a', { userFilters: [], filterPanelOpen: true })
    sessionStorage.setItem('other', 'keep')

    clearAllPersistedListStates()

    expect(sessionStorage.getItem(LIST_STATE_STORAGE_PREFIX + 'a')).toBeNull()
    expect(sessionStorage.getItem('other')).toBe('keep')
  })

  it('clearPersistedListState removes a single key', () => {
    savePersistedListState('a', { userFilters: [], filterPanelOpen: true })
    savePersistedListState('b', { userFilters: [], filterPanelOpen: true })

    clearPersistedListState('a')

    expect(loadPersistedListState('a')).toBeNull()
    expect(loadPersistedListState('b')?.filterPanelOpen).toBe(true)
  })
})
