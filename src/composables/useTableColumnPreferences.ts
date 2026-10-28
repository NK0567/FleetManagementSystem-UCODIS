import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { parseMinWidthPx } from '@/utils/columnWidth'

const STORAGE_PREFIX = 'table_prefs_'

export interface TableColumnPreferences {
  orderSortKeys?: string[]
  visibleSortKeys: string[]
  widths: Record<string, number>
  pinnedSortKeys?: string[]
}

function loadPreferences(tableId: string): TableColumnPreferences | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + tableId)
    if (!raw) return null
    const parsed = JSON.parse(raw) as TableColumnPreferences
    if (!parsed || !Array.isArray(parsed.visibleSortKeys)) return null
    const visible = parsed.visibleSortKeys
    const order =
      Array.isArray(parsed.orderSortKeys) && parsed.orderSortKeys.length > 0
        ? parsed.orderSortKeys
        : undefined
    const normalizedVisible = Array.isArray(visible) && visible.length > 0 ? visible : (order ?? [])
    return {
      orderSortKeys: order,
      visibleSortKeys: normalizedVisible,
      widths: typeof parsed.widths === 'object' && parsed.widths !== null ? parsed.widths : {},
      pinnedSortKeys: Array.isArray(parsed.pinnedSortKeys) ? parsed.pinnedSortKeys : []
    }
  } catch {
    return null
  }
}

function savePreferences(tableId: string, prefs: TableColumnPreferences): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + tableId, JSON.stringify(prefs))
  } catch {
    // Preferences are a convenience: a full or blocked storage must not break the list.
  }
}

/** Column visibility, order, pinning and width of a table, persisted per table id. */
export function useTableColumnPreferences(tableId: string, allColumns: Ref<TableColumn[]>) {
  const prefs = ref<TableColumnPreferences | null>(loadPreferences(tableId))

  function flushPersist(): void {
    if (prefs.value) savePreferences(tableId, prefs.value)
  }

  function allSortKeys(): string[] {
    return allColumns.value.map((c) => c.sortKey)
  }

  /** Columns shown without saved preferences; never zero columns, even if all are hidden. */
  function defaultVisibleSortKeys(): string[] {
    const shown = allColumns.value.filter((c) => !c.defaultHidden).map((c) => c.sortKey)
    if (shown.length > 0) return shown
    const first = allColumns.value[0]
    return first ? [first.sortKey] : []
  }

  function knownPreferenceKeys(): Set<string> {
    const keys = new Set<string>()
    for (const k of prefs.value?.visibleSortKeys ?? []) keys.add(k)
    for (const k of prefs.value?.orderSortKeys ?? []) keys.add(k)
    return keys
  }

  function newlyIntroducedVisibleSortKeys(): string[] {
    const known = knownPreferenceKeys()
    return allColumns.value
      .filter((c) => !known.has(c.sortKey) && !c.defaultHidden)
      .map((c) => c.sortKey)
  }

  function insertNewKeysPreservingOrder(currentOrder: string[], newKeys: string[]): string[] {
    if (newKeys.length === 0) return currentOrder
    const all = allSortKeys()
    const toInsert = new Set(newKeys)
    const result = [...currentOrder]
    const resultSet = new Set(result)

    for (const newKey of all) {
      if (!toInsert.has(newKey) || resultSet.has(newKey)) continue
      const declIdx = all.indexOf(newKey)
      let insertAt = result.length
      for (let i = declIdx - 1; i >= 0; i--) {
        const predIdx = result.indexOf(all[i] ?? '')
        if (predIdx >= 0) {
          insertAt = predIdx + 1
          break
        }
      }
      if (insertAt === result.length) {
        for (let i = declIdx + 1; i < all.length; i++) {
          const succIdx = result.indexOf(all[i] ?? '')
          if (succIdx >= 0) {
            insertAt = succIdx
            break
          }
        }
      }
      result.splice(insertAt, 0, newKey)
      resultSet.add(newKey)
    }
    return result
  }

  function effectiveVisibleSortKeys(): string[] {
    const all = allSortKeys()
    const saved = prefs.value?.visibleSortKeys
    if (Array.isArray(saved) && saved.length > 0) {
      const base = saved.filter((k) => all.includes(k))
      return insertNewKeysPreservingOrder(base, newlyIntroducedVisibleSortKeys())
    }
    return defaultVisibleSortKeys()
  }

  /** Hidden-by-default columns go last, sorted by label; the others keep their declared order. */
  function sortHiddenByLabel(keys: string[]): string[] {
    const byKey = new Map(allColumns.value.map((c) => [c.sortKey, c]))
    const shown = keys.filter((k) => !byKey.get(k)?.defaultHidden)
    const hidden = keys
      .filter((k) => byKey.get(k)?.defaultHidden)
      .sort((a, b) =>
        (byKey.get(a)?.label ?? a).localeCompare(byKey.get(b)?.label ?? b, undefined, {
          sensitivity: 'base'
        })
      )
    return [...shown, ...hidden]
  }

  const orderSortKeys = computed(() => {
    const all = allSortKeys()
    const byKey = new Map(allColumns.value.map((c) => [c.sortKey, c]))
    const saved = prefs.value?.orderSortKeys
    const visible = prefs.value?.visibleSortKeys ?? []
    if (Array.isArray(saved) && saved.length > 0) {
      const set = new Set(all)
      const ordered = saved.filter((k) => set.has(k))
      const added = all.filter((k) => !ordered.includes(k))
      const addedShown = added.filter((k) => !byKey.get(k)?.defaultHidden)
      const addedHidden = added.filter((k) => byKey.get(k)?.defaultHidden)
      return [
        ...insertNewKeysPreservingOrder(ordered, addedShown),
        ...sortHiddenByLabel(addedHidden)
      ]
    }
    const visibleSet = new Set(visible)
    const rest = all.filter((k) => !visibleSet.has(k))
    return [...visible.filter((k) => all.includes(k)), ...sortHiddenByLabel(rest)]
  })

  const visibleSortKeys = computed(() => {
    // The order lists every column, hidden ones included, so a re-enabled column returns in place.
    const order = orderSortKeys.value
    const effective = new Set(effectiveVisibleSortKeys())
    const orderedVisible = order.filter((k) => effective.has(k))
    return orderedVisible.length > 0 ? orderedVisible : defaultVisibleSortKeys()
  })

  const widths = computed(() => prefs.value?.widths ?? {})

  const pinnedSortKeys = computed(() => prefs.value?.pinnedSortKeys ?? [])

  const stickyColumnCount = computed(() => {
    const visible = new Set(visibleSortKeys.value)
    return pinnedSortKeys.value.filter((k) => visible.has(k)).length
  })

  const visibleColumns = computed<TableColumn[]>(() => {
    const all = allColumns.value
    const keys = visibleSortKeys.value
    const pinned = pinnedSortKeys.value.filter((k) => keys.includes(k))
    const rest = keys.filter((k) => !pinned.includes(k))
    const orderedKeys = [...pinned, ...rest]
    const byKey = new Map(all.map((c) => [c.sortKey, c]))
    const result: TableColumn[] = []
    for (const key of orderedKeys) {
      const col = byKey.get(key)
      if (col) result.push(col)
    }
    const withWidth: TableColumn[] = result.map((col) => {
      const minPx = parseMinWidthPx(col.minW)
      const w = widths.value[col.sortKey]
      const widthPx = w != null && w >= minPx ? w : undefined
      return { ...col, width: widthPx } as TableColumn
    })
    return withWidth
  })

  function setColumnVisible(sortKey: string, visible: boolean): void {
    const current = visibleSortKeys.value
    const set = new Set(current)
    const all = allColumns.value.map((c) => c.sortKey)
    const order = orderSortKeys.value
    if (visible) {
      if (set.has(sortKey)) return
      if (!all.includes(sortKey)) return
      const next = order.filter((k) => current.includes(k) || k === sortKey)
      prefs.value = {
        orderSortKeys: order,
        visibleSortKeys: next,
        widths: prefs.value?.widths ?? {},
        pinnedSortKeys: prefs.value?.pinnedSortKeys ?? []
      }
      flushPersist()
      return
    } else {
      if (!set.has(sortKey)) return
      const next = current.filter((k) => k !== sortKey)
      if (next.length === 0) return
      const nextPinned = (prefs.value?.pinnedSortKeys ?? []).filter((k) => k !== sortKey)
      prefs.value = {
        orderSortKeys: order,
        visibleSortKeys: next,
        widths: prefs.value?.widths ?? {},
        pinnedSortKeys: nextPinned
      }
    }
    flushPersist()
  }

  function setColumnPinned(sortKey: string, pinned: boolean): void {
    const currentPinned = prefs.value?.pinnedSortKeys ?? []
    const visible = visibleSortKeys.value
    const order = orderSortKeys.value
    if (!visible.includes(sortKey)) return
    if (pinned) {
      if (currentPinned.includes(sortKey)) return
      prefs.value = {
        orderSortKeys: order,
        visibleSortKeys: prefs.value?.visibleSortKeys ?? visible,
        widths: prefs.value?.widths ?? {},
        pinnedSortKeys: [...currentPinned, sortKey]
      }
    } else {
      if (!currentPinned.includes(sortKey)) return
      prefs.value = {
        orderSortKeys: order,
        visibleSortKeys: prefs.value?.visibleSortKeys ?? visible,
        widths: prefs.value?.widths ?? {},
        pinnedSortKeys: currentPinned.filter((k) => k !== sortKey)
      }
    }
    flushPersist()
  }

  function setColumnOrder(orderedSortKeys: string[]): void {
    const all = allSortKeys()
    const valid = orderedSortKeys.filter((k) => all.includes(k))
    const missing = all.filter((k) => !valid.includes(k))
    const fullOrder = [...valid, ...missing]
    if (fullOrder.length === 0) return

    const effectiveVisible = effectiveVisibleSortKeys()
    const newVisible = fullOrder.filter((k) => effectiveVisible.includes(k))
    const currentPinned = prefs.value?.pinnedSortKeys ?? []
    const newPinned = newVisible.filter((k) => currentPinned.includes(k))
    prefs.value = {
      orderSortKeys: fullOrder,
      visibleSortKeys: newVisible.length > 0 ? newVisible : effectiveVisible,
      widths: prefs.value?.widths ?? {},
      pinnedSortKeys: newPinned
    }
    flushPersist()
  }

  function reorderVisibleColumns(newVisibleOrder: string[]): void {
    const order = orderSortKeys.value
    const rest = order.filter((k) => !newVisibleOrder.includes(k))
    setColumnOrder([...newVisibleOrder, ...rest])
  }

  function setColumnWidth(sortKey: string, widthPx: number, persistImmediately = false): void {
    const col = allColumns.value.find((c) => c.sortKey === sortKey)
    const minPx = col ? parseMinWidthPx(col.minW) : 80
    const clamped = Math.max(minPx, Math.round(widthPx))
    if (prefs.value?.widths?.[sortKey] === clamped) {
      if (persistImmediately) flushPersist()
      return
    }

    if (prefs.value) {
      // Mutated in place: a resize drag fires on every frame.
      prefs.value.widths[sortKey] = clamped
    } else {
      prefs.value = {
        orderSortKeys: orderSortKeys.value,
        visibleSortKeys: effectiveVisibleSortKeys(),
        widths: { [sortKey]: clamped },
        pinnedSortKeys: []
      }
    }

    if (persistImmediately) flushPersist()
  }

  function resetPreferences(): void {
    prefs.value = null
    localStorage.removeItem(STORAGE_PREFIX + tableId)
  }

  return {
    visibleColumns,
    visibleSortKeys,
    orderSortKeys,
    pinnedSortKeys,
    stickyColumnCount,
    widths,
    setColumnVisible,
    setColumnWidth,
    setColumnPinned,
    setColumnOrder,
    reorderVisibleColumns,
    resetPreferences,
    commitPreferences: flushPersist,
    isColumnVisible(sortKey: string): boolean {
      return visibleSortKeys.value.includes(sortKey)
    },
    isColumnPinned(sortKey: string): boolean {
      return (prefs.value?.pinnedSortKeys ?? []).includes(sortKey)
    }
  }
}
