<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, useSlots } from 'vue'
import FilterPanel from './FilterPanel.vue'
import SortableTableHeader from './SortableTableHeader.vue'
import type { TableColumn } from './SortableTableHeader.vue'
import PaginationBar from './PaginationBar.vue'
import LoadingSpinner from './LoadingSpinner.vue'
import { getListCellDisplay } from '@/utils/listCellDisplay'
import { shouldRightAlignNumeric } from '@/utils/listCellAlign'
import { parseMinWidthPx } from '@/utils/columnWidth'

const props = defineProps<{
  filterPanelOpen: boolean
  tableColumns: TableColumn[]
  sortBy: string | null
  sortDirection: 'ASC' | 'DESC'
  loading: boolean
  loadingText: string
  items: unknown[]
  rowKey: string
  selectedItem: unknown
  error: string | null
  searchQuery: string | null
  noResultsMessage: string
  noSearchResultsMessage: string
  page: number
  totalPages: number
  total: number
  countLabel?: string
  limit?: number
  showDetailsPanel: boolean
  stickyColumnCount?: number
  resizable?: boolean
  reorderable?: boolean
  onReorderColumns?: (newVisibleOrder: string[]) => void
  rowClass?: (item: unknown) => string
}>()

const stickyColumnCount = computed(() => Math.max(0, props.stickyColumnCount ?? 0))

function getColWidthPx(col: TableColumn): number {
  if (col.width != null && col.width >= parseMinWidthPx(col.minW)) return col.width
  return parseMinWidthPx(col.minW)
}

const stickyLeftOffsets = computed(() => {
  const offsets: number[] = []
  let left = 0
  for (const column of props.tableColumns.slice(0, stickyColumnCount.value)) {
    offsets.push(left)
    left += getColWidthPx(column)
  }
  return offsets
})

const emit = defineEmits<{
  'close-filter': []
  'reset-filters': []
  sort: [sortKey: string, direction: 'ASC' | 'DESC']
  'update:page': [page: number]
  'update:limit': [limit: number]
  'update:width': [sortKey: string, widthPx: number, persist?: boolean]
  'select-item': [item: unknown]
  'row-dblclick': [item: unknown]
  'primary-cell-click': [item: unknown, value: unknown]
}>()

const slots = useSlots()
const useRowSlot = computed(() => !!slots.row)

const isSelected = (item: unknown) => {
  if (props.selectedItem == null) return false
  const key = props.rowKey
  const obj = item as Record<string, unknown>
  const sel = props.selectedItem as Record<string, unknown>
  const itemVal = obj[key]
  const selectedVal = sel[key]
  return itemVal != null && itemVal === selectedVal
}

const getRowAlertClass = (item: unknown) => props.rowClass?.(item) ?? ''

function getMainRowClass(item: unknown): string {
  const alert = getRowAlertClass(item)
  if (isSelected(item)) {
    return alert ? `${alert} ring-2 ring-inset ring-primary` : 'bg-accent'
  }
  return alert || 'hover:bg-accent'
}

const getRowKey = (item: unknown) => String((item as Record<string, unknown>)[props.rowKey])

const emptyMessage = computed(() =>
  props.searchQuery ? props.noSearchResultsMessage : props.noResultsMessage
)

const cellBaseClass =
  'px-2 py-1 whitespace-nowrap text-card-foreground overflow-hidden text-ellipsis min-w-0 text-xs lg:text-sm'

function getCellValue(item: unknown, col: TableColumn): unknown {
  const key = col.field ?? col.sortKey
  return (item as Record<string, unknown>)[key]
}

const getCellDisplay = getListCellDisplay

function getCellClass(value: unknown, item: unknown, col: TableColumn): string {
  const computedNumericClass = shouldRightAlignNumeric(value, col) ? 'text-right tabular-nums' : ''
  const extra = [computedNumericClass, col.cellClass ? col.cellClass(value, item) : '']
    .filter(Boolean)
    .join(' ')
  return extra ? `${cellBaseClass} ${extra}`.trim() : cellBaseClass
}

function hasCellSlot(sortKey: string): boolean {
  const name = `cell-${sortKey}` as keyof typeof slots
  return !!slots[name]
}

const tableScrollLeft = ref(0)
const showStickyShadow = computed(() => tableScrollLeft.value > 0)

const tableViewportWidth = ref(0)
const tableScrollContainerRef = ref<HTMLDivElement | null>(null)
let tableResizeObserver: ResizeObserver | null = null

function updateTableViewportWidth() {
  const el = tableScrollContainerRef.value
  if (el) tableViewportWidth.value = el.clientWidth
}

function onTableScroll(e: Event) {
  const el = e.currentTarget as HTMLDivElement
  if (el) tableScrollLeft.value = el.scrollLeft
}

onMounted(() => {
  updateTableViewportWidth()
  const el = tableScrollContainerRef.value
  if (!el || typeof ResizeObserver === 'undefined') return
  tableResizeObserver = new ResizeObserver(() => updateTableViewportWidth())
  tableResizeObserver.observe(el)
})

onBeforeUnmount(() => {
  tableResizeObserver?.disconnect()
  tableResizeObserver = null
})
</script>

<template>
  <div class="flex flex-1 overflow-hidden gap-4 px-2 py-3">
    <FilterPanel
      :open="filterPanelOpen"
      @close="emit('close-filter')"
      @reset-filters="emit('reset-filters')"
    >
      <template v-if="slots['filter-panel']" #default>
        <slot name="filter-panel" />
      </template>
    </FilterPanel>

    <div class="flex-1 bg-card rounded border border-border overflow-hidden flex flex-col">
      <div
        ref="tableScrollContainerRef"
        class="overflow-x-auto flex-1 flex flex-col table-scroll-container"
        :class="{ 'sticky-scrolled-right': showStickyShadow }"
        @scroll="onTableScroll"
      >
        <table class="w-full text-sm table-fixed">
          <colgroup>
            <col
              v-for="col in tableColumns"
              :key="col.sortKey"
              :style="{ width: getColWidthPx(col) + 'px', minWidth: getColWidthPx(col) + 'px' }"
            />
          </colgroup>
          <SortableTableHeader
            :columns="tableColumns"
            :sort-by="sortBy"
            :sort-direction="sortDirection"
            :sticky-column-count="stickyColumnCount"
            :sticky-left-offsets="stickyLeftOffsets"
            :resizable="resizable ?? false"
            :reorderable="reorderable ?? false"
            @sort="(sortKey, direction) => emit('sort', sortKey, direction)"
            @update:width="
              (sortKey, widthPx, persist) => emit('update:width', sortKey, widthPx, persist)
            "
            @reorder="(newVisibleOrder) => onReorderColumns?.(newVisibleOrder)"
          />
          <tbody class="divide-y divide-border">
            <tr v-if="loading">
              <td :colspan="tableColumns.length" class="p-0">
                <div
                  class="sticky left-0 flex justify-center px-4 py-8"
                  :style="tableViewportWidth > 0 ? { width: `${tableViewportWidth}px` } : undefined"
                >
                  <LoadingSpinner :text="loadingText" />
                </div>
              </td>
            </tr>
            <template v-else v-for="item in items" :key="getRowKey(item)">
              <tr
                class="cursor-pointer transition-colors"
                :class="getMainRowClass(item)"
                @click="emit('select-item', item)"
                @dblclick="emit('row-dblclick', item)"
              >
                <template v-if="useRowSlot">
                  <slot name="row" :item="item" :selected="isSelected(item)" />
                </template>
                <template v-else>
                  <td
                    v-for="(col, colIndex) in tableColumns"
                    :key="col.sortKey"
                    :class="[
                      getCellClass(getCellValue(item, col), item, col),
                      stickyColumnCount > 0 && colIndex < stickyColumnCount && 'sticky-cell',
                      stickyColumnCount > 0 &&
                        colIndex === stickyColumnCount - 1 &&
                        'sticky-cell-last'
                    ]"
                    :style="
                      stickyColumnCount > 0 && colIndex < stickyColumnCount
                        ? {
                            position: 'sticky',
                            left: `${stickyLeftOffsets[colIndex] ?? 0}px`,
                            zIndex: 1
                          }
                        : undefined
                    "
                  >
                    <template v-if="hasCellSlot(col.sortKey)">
                      <slot
                        :name="`cell-${col.sortKey}`"
                        :item="item"
                        :value="getCellValue(item, col)"
                        :column="col"
                      />
                    </template>
                    <template v-else-if="col.cell === 'link'">
                      <button
                        type="button"
                        class="block w-full min-w-0 max-w-full truncate text-left text-primary hover:underline font-medium bg-transparent border-0 cursor-pointer p-0"
                        @click.stop="emit('primary-cell-click', item, getCellValue(item, col))"
                      >
                        {{ getCellDisplay(getCellValue(item, col), item, col) }}
                      </button>
                    </template>
                    <template v-else>
                      <span class="block min-w-0 truncate">
                        {{ getCellDisplay(getCellValue(item, col), item, col) }}
                      </span>
                    </template>
                  </td>
                </template>
              </tr>
            </template>
          </tbody>
        </table>
        <div v-if="error" class="flex items-center justify-center flex-1 p-4">
          <p class="text-destructive text-center">{{ error }}</p>
        </div>
        <div
          v-if="!loading && (items?.length ?? 0) === 0"
          class="flex items-center justify-center flex-1"
        >
          <p class="text-muted-foreground text-center">{{ emptyMessage }}</p>
        </div>
      </div>
      <PaginationBar
        :page="page"
        :total-pages="totalPages"
        :total="total"
        :count-label="countLabel"
        :limit="limit ?? 25"
        @update:page="(p) => emit('update:page', p)"
        @update:limit="(l) => emit('update:limit', l)"
      />
    </div>

    <transition name="filter-slide">
      <div
        v-if="showDetailsPanel"
        class="w-96 bg-card rounded border border-border overflow-y-auto flex flex-col shrink-0"
      >
        <slot name="details-panel" />
      </div>
    </transition>
  </div>
</template>

<style scoped>
.filter-slide-enter-active,
.filter-slide-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}
.filter-slide-enter-from,
.filter-slide-leave-to {
  opacity: 0;
  width: 0;
  min-width: 0;
  padding-left: 0;
  padding-right: 0;
  margin-right: -1rem;
}

.sticky-cell {
  background: var(--color-card);
  transition: none; /* keep hover in sync with row, no delay */
}
tr:hover .sticky-cell {
  background: var(--color-accent);
}
tr.bg-accent .sticky-cell {
  background: var(--color-accent);
}
.sticky-cell-last {
  box-shadow: none;
}
.sticky-scrolled-right .sticky-cell-last {
  box-shadow: 2px 0 6px rgba(0, 0, 0, 0.08);
}
.sticky-scrolled-right :deep(.sticky-th-last) {
  box-shadow: 2px 0 6px rgba(0, 0, 0, 0.08);
}
</style>
