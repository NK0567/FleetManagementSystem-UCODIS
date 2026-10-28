import { describe, expect, it, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { useTableColumnPreferences } from './useTableColumnPreferences'

const TABLE_ID = 'test_table_prefs'

const columns = ref<TableColumn[]>([
  { sortKey: 'no', label: 'No', minW: '80px' },
  { sortKey: 'name', label: 'Name', minW: '120px' },
  { sortKey: 'status', label: 'Status', minW: '100px' }
])

const withHidden = ref<TableColumn[]>([
  { sortKey: 'no', label: 'No' },
  { sortKey: 'name', label: 'Name' },
  { sortKey: 'city', label: 'City', defaultHidden: true },
  { sortKey: 'email', label: 'Email', defaultHidden: true },
  { sortKey: 'phone', label: 'Phone', defaultHidden: true }
])

const storageKey = (id: string) => `table_prefs_${id}`

describe('useTableColumnPreferences', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('persists column order on first reorder when no prefs exist yet', () => {
    const { visibleSortKeys, orderSortKeys, reorderVisibleColumns } = useTableColumnPreferences(
      TABLE_ID,
      columns
    )

    expect(visibleSortKeys.value).toEqual(['no', 'name', 'status'])

    reorderVisibleColumns(['name', 'no', 'status'])

    expect(orderSortKeys.value).toEqual(['name', 'no', 'status'])
    expect(visibleSortKeys.value).toEqual(['name', 'no', 'status'])
  })

  it('keeps hidden columns at the end when reordering visible columns', () => {
    const prefs = useTableColumnPreferences(TABLE_ID, columns)
    prefs.setColumnVisible('status', false)
    prefs.reorderVisibleColumns(['name', 'no'])

    expect(prefs.orderSortKeys.value).toEqual(['name', 'no', 'status'])
    expect(prefs.visibleSortKeys.value).toEqual(['name', 'no'])
  })

  describe('defaultHidden', () => {
    it('hides flagged columns for a user without preferences', () => {
      const prefs = useTableColumnPreferences(TABLE_ID, withHidden)

      expect(prefs.visibleSortKeys.value).toEqual(['no', 'name'])
      expect(prefs.orderSortKeys.value).toEqual(['no', 'name', 'city', 'email', 'phone'])
      expect(prefs.isColumnVisible('city')).toBe(false)
    })

    it('re-enables a hidden column at its original position', () => {
      const prefs = useTableColumnPreferences(TABLE_ID, withHidden)
      prefs.setColumnVisible('email', true)

      expect(prefs.visibleSortKeys.value).toEqual(['no', 'name', 'email'])
      expect(prefs.orderSortKeys.value).toEqual(['no', 'name', 'city', 'email', 'phone'])
    })

    it('never adds hidden-by-default columns to existing preferences', () => {
      localStorage.setItem(
        storageKey(TABLE_ID),
        JSON.stringify({
          visibleSortKeys: ['no', 'name'],
          orderSortKeys: ['no', 'name'],
          widths: {},
          pinnedSortKeys: []
        })
      )
      const prefs = useTableColumnPreferences(TABLE_ID, withHidden)

      expect(prefs.visibleSortKeys.value).toEqual(['no', 'name'])
      expect(prefs.orderSortKeys.value).toEqual(['no', 'name', 'city', 'email', 'phone'])
    })

    it('merges a new visible column at its declared position', () => {
      localStorage.setItem(
        storageKey(TABLE_ID),
        JSON.stringify({
          visibleSortKeys: ['no', 'name', 'status'],
          orderSortKeys: ['no', 'name', 'status'],
          widths: { name: 180 },
          pinnedSortKeys: []
        })
      )
      const withGift = ref<TableColumn[]>([
        { sortKey: 'no', label: 'No' },
        { sortKey: 'name', label: 'Name' },
        { sortKey: 'gift', label: 'Gift' },
        { sortKey: 'status', label: 'Status' }
      ])
      const prefs = useTableColumnPreferences(TABLE_ID, withGift)

      expect(prefs.visibleSortKeys.value).toEqual(['no', 'name', 'gift', 'status'])
      expect(prefs.orderSortKeys.value).toEqual(['no', 'name', 'gift', 'status'])
    })

    it('does not turn hidden columns visible when resizing', () => {
      const prefs = useTableColumnPreferences(TABLE_ID, withHidden)
      prefs.setColumnWidth('name', 220, true)

      expect(prefs.visibleSortKeys.value).toEqual(['no', 'name'])
      const saved = JSON.parse(localStorage.getItem(storageKey(TABLE_ID)) as string)
      expect(saved.visibleSortKeys).toEqual(['no', 'name'])
    })

    it('writes storage at the end of a drag only', () => {
      const prefs = useTableColumnPreferences(TABLE_ID, columns)
      prefs.setColumnWidth('name', 200, false)
      expect(localStorage.getItem(storageKey(TABLE_ID))).toBeNull()
      expect(prefs.widths.value.name).toBe(200)

      prefs.setColumnWidth('name', 240, true)
      const saved = JSON.parse(localStorage.getItem(storageKey(TABLE_ID)) as string)
      expect(saved.widths.name).toBe(240)
    })

    it('resetPreferences restores the default columns, not all of them', () => {
      const prefs = useTableColumnPreferences(TABLE_ID, withHidden)
      prefs.setColumnVisible('city', true)
      prefs.setColumnVisible('phone', true)
      expect(prefs.visibleSortKeys.value).toEqual(['no', 'name', 'city', 'phone'])

      prefs.resetPreferences()

      expect(prefs.visibleSortKeys.value).toEqual(['no', 'name'])
    })

    it('refuses to hide the last visible column', () => {
      const prefs = useTableColumnPreferences(TABLE_ID, withHidden)
      prefs.setColumnVisible('no', false)
      expect(prefs.visibleSortKeys.value).toEqual(['name'])

      prefs.setColumnVisible('name', false)
      expect(prefs.visibleSortKeys.value).toEqual(['name'])
    })

    it('falls back to the first column when every column is hidden', () => {
      const allHidden = ref<TableColumn[]>([
        { sortKey: 'a', label: 'A', defaultHidden: true },
        { sortKey: 'b', label: 'B', defaultHidden: true }
      ])
      const prefs = useTableColumnPreferences('test_all_hidden', allHidden)

      expect(prefs.visibleSortKeys.value).toEqual(['a'])
    })

    it('shows every column when none is hidden by default', () => {
      const prefs = useTableColumnPreferences('test_no_flag', columns)
      expect(prefs.visibleSortKeys.value).toEqual(['no', 'name', 'status'])
    })
  })
})
