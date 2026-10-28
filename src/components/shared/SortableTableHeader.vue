<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted, withDefaults } from 'vue'
import { ArrowUpDown, ArrowUp, ArrowDown, GripVertical } from '@lucide/vue'
import { parseMinWidthPx } from '@/utils/columnWidth'

export interface TableColumn {
  sortKey: string
  label: string
  minW?: string
  width?: number
  field?: string
  cell?: 'text' | 'link'
  formatter?: (value: unknown, item: unknown) => string
  cellClass?: (value: unknown, item: unknown) => string
  align?: 'left' | 'right' | 'center'
  /** Offered in the column picker but hidden until the user turns it on. */
  defaultHidden?: boolean
}

const props = withDefaults(
  defineProps<{
    columns: TableColumn[]
    sortBy: string | null
    sortDirection: 'ASC' | 'DESC'
    stickyColumnCount?: number
    /** Index of the first column taking part in the sticky area. */
    stickyColumnStartIndex?: number
    stickyLeftOffsets?: number[]
    resizable?: boolean
    sortable?: boolean
    reorderable?: boolean
    hasExpandColumn?: boolean
    hasSelectColumn?: boolean
    tone?: 'muted' | 'primary'
  }>(),
  {
    sortable: true,
    tone: 'muted',
    stickyColumnStartIndex: 0
  }
)

const isPrimaryTone = computed(() => props.tone === 'primary')

function isStickyColumn(index: number): boolean {
  const count = props.stickyColumnCount ?? 0
  if (count <= 0) return false
  const start = props.stickyColumnStartIndex ?? 0
  return index >= start && index < start + count
}

function stickyColumnOffsetIndex(index: number): number {
  return index - (props.stickyColumnStartIndex ?? 0)
}

const emit = defineEmits<{
  sort: [sortKey: string, direction: 'ASC' | 'DESC']
  'update:width': [sortKey: string, widthPx: number, persist?: boolean]
  reorder: [newVisibleSortKeys: string[]]
}>()

const openSortColumn = ref<string | null>(null)
const sortMenuPosition = ref<{ top: number; left: number; width: number } | null>(null)

const toggleSortMenu = (sortKey: string, event?: MouseEvent) => {
  if (openSortColumn.value === sortKey) {
    openSortColumn.value = null
    sortMenuPosition.value = null
    return
  }
  openSortColumn.value = sortKey
  if (event) {
    const th = (event.currentTarget as HTMLElement).closest('th')
    if (th) {
      const rect = th.getBoundingClientRect()
      sortMenuPosition.value = {
        top: rect.bottom + 2,
        left: rect.left,
        width: Math.max(rect.width, 180)
      }
    } else {
      sortMenuPosition.value = null
    }
  } else {
    sortMenuPosition.value = null
  }
}

const applySort = (sortKey: string, direction: 'ASC' | 'DESC') => {
  emit('sort', sortKey, direction)
  openSortColumn.value = null
  sortMenuPosition.value = null
}

const closeSortMenu = () => {
  openSortColumn.value = null
  sortMenuPosition.value = null
}

const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as Element
  if (
    openSortColumn.value &&
    !target.closest('thead th') &&
    !target.closest('[data-sort-dropdown]')
  ) {
    closeSortMenu()
  }
}

function getColWidthStyle(col: TableColumn): { width?: string; minWidth: string } {
  const minPx = parseMinWidthPx(col.minW)
  const w = col.width != null && col.width >= minPx ? col.width : undefined
  return {
    width: w != null ? `${w}px` : undefined,
    minWidth: col.minW ?? `${minPx}px`
  }
}

let resizeStartX = 0
let resizeStartWidth = 0
let resizeSortKey: string | null = null
let resizeMinPx = 80
let resizeRafId: number | null = null
let resizePendingWidth: number | null = null

function onResizeStart(e: MouseEvent, col: TableColumn) {
  e.preventDefault()
  e.stopPropagation()
  const th = (e.currentTarget as HTMLElement).closest('th')
  if (!th) return
  resizeSortKey = col.sortKey
  resizeStartX = e.clientX
  resizeMinPx = parseMinWidthPx(col.minW)
  resizeStartWidth = col.width ?? th.getBoundingClientRect().width ?? resizeMinPx
  resizePendingWidth = null
  document.addEventListener('mousemove', onResizeMove)
  document.addEventListener('mouseup', onResizeEnd)
}

function onResizeMove(e: MouseEvent) {
  if (resizeSortKey == null) return
  const delta = e.clientX - resizeStartX
  resizePendingWidth = Math.max(resizeMinPx, Math.round(resizeStartWidth + delta))
  if (resizeRafId != null) return
  resizeRafId = requestAnimationFrame(() => {
    resizeRafId = null
    if (resizeSortKey == null || resizePendingWidth == null) return
    emit('update:width', resizeSortKey, resizePendingWidth, false)
  })
}

function onResizeEnd() {
  if (resizeRafId != null) {
    cancelAnimationFrame(resizeRafId)
    resizeRafId = null
  }
  if (resizeSortKey != null && resizePendingWidth != null) {
    emit('update:width', resizeSortKey, resizePendingWidth, true)
  }
  resizeSortKey = null
  resizePendingWidth = null
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
}

const dragFromIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

function onReorderDragStart(e: DragEvent, index: number) {
  dragFromIndex.value = index
  e.dataTransfer!.effectAllowed = 'move'
  e.dataTransfer!.setData('text/plain', String(index))
}

function onReorderDragOver(e: DragEvent, index: number) {
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'move'
  dragOverIndex.value = index
}

function onReorderDragLeave() {
  dragOverIndex.value = null
}

function onReorderDrop(e: DragEvent, dropIndex: number) {
  e.preventDefault()
  dragOverIndex.value = null
  const from = dragFromIndex.value
  if (from == null || from === dropIndex) {
    dragFromIndex.value = null
    return
  }
  const keys = [...props.columns.map((c) => c.sortKey)]
  const [removed] = keys.splice(from, 1)
  keys.splice(dropIndex, 0, removed!)
  emit('reorder', keys)
  dragFromIndex.value = null
}

function onReorderDragEnd() {
  dragFromIndex.value = null
  dragOverIndex.value = null
}

function onViewportChange() {
  if (openSortColumn.value) closeSortMenu()
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
  window.addEventListener('resize', onViewportChange)
  window.addEventListener('scroll', onViewportChange, true)
})
onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('scroll', onViewportChange, true)
  onResizeEnd()
})
</script>

<template>
  <thead
    class="table-header-row border-b border-border sticky top-0 z-10"
    :class="isPrimaryTone ? 'bg-primary table-header-row--primary' : 'bg-muted'"
  >
    <tr>
      <th
        v-if="hasSelectColumn"
        class="w-8 px-2 sticky top-0 text-center"
        :class="isPrimaryTone ? 'bg-primary' : 'bg-muted/40'"
      >
        <slot name="select-header" />
      </th>
      <th
        v-if="hasExpandColumn"
        class="w-8 px-1 sticky top-0"
        :class="isPrimaryTone ? 'bg-primary' : 'bg-muted/40'"
        aria-hidden="true"
      />
      <th
        v-for="(col, index) in columns"
        :key="col.sortKey"
        :class="[
          'text-xs lg:text-xs group px-2 py-2 font-semibold whitespace-nowrap min-w-0 select-none transition relative overflow-hidden',
          isPrimaryTone ? 'text-primary-foreground' : 'text-muted-foreground',
          col.align === 'right'
            ? 'text-right'
            : col.align === 'center'
              ? 'text-center'
              : 'text-left',
          sortable ? 'cursor-pointer' : 'cursor-default',
          sortable || resizable
            ? isPrimaryTone
              ? 'hover:bg-primary-foreground/20'
              : 'hover:bg-primary/20'
            : '',
          {
            'sticky-th': isStickyColumn(index),
            'sticky-th-last':
              isStickyColumn(index) &&
              index === (props.stickyColumnStartIndex ?? 0) + (props.stickyColumnCount ?? 0) - 1,
            'opacity-50': reorderable && dragFromIndex === index,
            'ring-1 ring-primary ring-inset bg-primary/10':
              reorderable && dragOverIndex === index && dragFromIndex !== null
          }
        ]"
        :style="[
          getColWidthStyle(col),
          isStickyColumn(index) && props.stickyLeftOffsets
            ? {
                position: 'sticky',
                left: `${props.stickyLeftOffsets[stickyColumnOffsetIndex(index)] ?? 0}px`,
                zIndex: 2
              }
            : undefined
        ]"
        @click.stop="sortable ? toggleSortMenu(col.sortKey, $event) : undefined"
        @dragover="reorderable ? onReorderDragOver($event, index) : undefined"
        @dragleave="reorderable ? onReorderDragLeave() : undefined"
        @drop="reorderable ? onReorderDrop($event, index) : undefined"
        :title="col.label"
      >
        <span class="inline-flex items-center gap-0.5 min-w-0 w-full">
          <span
            v-if="reorderable"
            draggable="true"
            class="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground touch-none self-center"
            :class="{ 'opacity-50': dragFromIndex === index }"
            :aria-label="$t('common.reorderColumn', { column: col.label })"
            @mousedown.stop
            @click.stop
            @dragstart="onReorderDragStart($event, index)"
            @dragend="onReorderDragEnd"
          >
            <GripVertical class="w-3.5 h-3.5" />
          </span>
          <span class="min-w-0 flex-1 truncate">{{ col.label }}</span>
          <ArrowUp
            v-if="sortable && sortBy === col.sortKey && sortDirection === 'ASC'"
            class="w-3 h-3 shrink-0"
          />
          <ArrowDown
            v-else-if="sortable && sortBy === col.sortKey && sortDirection === 'DESC'"
            class="w-3 h-3 shrink-0"
          />
          <ArrowUpDown
            v-else-if="sortable"
            class="hidden group-hover:block w-3 h-3 shrink-0 opacity-60"
          />
        </span>

        <Teleport to="body">
          <div
            v-show="openSortColumn === col.sortKey && sortMenuPosition"
            data-sort-dropdown
            class="fixed z-[100] min-w-[180px] rounded-md border border-border bg-card py-1 shadow-lg"
            :style="
              sortMenuPosition
                ? {
                    top: `${sortMenuPosition.top}px`,
                    left: `${sortMenuPosition.left}px`,
                    width: `${sortMenuPosition.width}px`
                  }
                : undefined
            "
            @click.stop
          >
            <button
              type="button"
              class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-card-foreground hover:bg-accent transition"
              @click="applySort(col.sortKey, 'ASC')"
            >
              <span class="flex shrink-0 flex-col items-center text-primary" aria-hidden="true">
                <span class="text-[10px] font-semibold leading-none">A</span>
                <span class="text-[8px]">&#9660;</span>
                <span class="text-[10px] font-semibold leading-none">Z</span>
              </span>
              <span>{{ $t('common.sortAsc') }}</span>
            </button>
            <button
              type="button"
              class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-card-foreground hover:bg-accent transition"
              @click="applySort(col.sortKey, 'DESC')"
            >
              <span class="flex shrink-0 flex-col items-center text-primary" aria-hidden="true">
                <span class="text-[10px] font-semibold leading-none">Z</span>
                <span class="text-[8px]">&#9660;</span>
                <span class="text-[10px] font-semibold leading-none">A</span>
              </span>
              <span>{{ $t('common.sortDesc') }}</span>
            </button>
          </div>
        </Teleport>
        <div
          v-if="resizable"
          class="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize shrink-0 touch-none"
          :aria-label="undefined"
          @mousedown.stop="onResizeStart($event, col)"
        >
          <span class="sr-only" :aria-label="undefined">{{
            $t('common.resizeColumn', { column: col.label })
          }}</span>
        </div>
      </th>
    </tr>
  </thead>
</template>

<style scoped>
.table-header-row {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
}
.sticky-th {
  background: var(--color-muted);
}
.table-header-row--primary .sticky-th {
  background: var(--color-primary);
}
</style>
