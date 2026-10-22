<script lang="ts" setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Pin, PinOff, GripVertical } from '@lucide/vue'
import type { TableColumn } from './SortableTableHeader.vue'

const { t } = useI18n()

const props = defineProps<{
  allColumns: TableColumn[]
  orderSortKeys: string[]
  visibleSortKeys: string[]
  pinnedSortKeys: string[]
  isColumnVisible: (sortKey: string) => boolean
  isColumnPinned: (sortKey: string) => boolean
  setColumnVisible: (sortKey: string, visible: boolean) => void
  setColumnPinned: (sortKey: string, pinned: boolean) => void
  setColumnOrder: (orderedSortKeys: string[]) => void
  resetPreferences: () => void
}>()

const bySortKey = computed(() => new Map(props.allColumns.map((c) => [c.sortKey, c])))
const orderedColumns = computed(() => {
  const order =
    props.orderSortKeys.length > 0 ? props.orderSortKeys : props.allColumns.map((c) => c.sortKey)
  const result: TableColumn[] = []
  for (const key of order) {
    const col = bySortKey.value.get(key)
    if (col) result.push(col)
  }
  const added = props.allColumns.filter((c) => !order.includes(c.sortKey))
  return [...result, ...added]
})

const dragFromIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

function onDragStart(e: DragEvent, index: number) {
  dragFromIndex.value = index
  e.dataTransfer!.effectAllowed = 'move'
  e.dataTransfer!.setData('text/plain', String(index))
}

function onDragOver(e: DragEvent, index: number) {
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'move'
  dragOverIndex.value = index
}

function onDragLeave() {
  dragOverIndex.value = null
}

function onDrop(e: DragEvent, dropIndex: number) {
  e.preventDefault()
  dragOverIndex.value = null
  const from = dragFromIndex.value
  if (from == null || from === dropIndex) {
    dragFromIndex.value = null
    return
  }
  const keys = [...orderedColumns.value.map((c) => c.sortKey)]
  const [removed] = keys.splice(from, 1)
  keys.splice(dropIndex, 0, removed!)
  props.setColumnOrder(keys)
  dragFromIndex.value = null
}

function onDragEnd() {
  dragFromIndex.value = null
  dragOverIndex.value = null
}
</script>

<template>
  <div
    class="min-w-[260px] max-h-[70vh] overflow-y-auto rounded-md border border-border bg-card py-1 shadow-lg"
    role="menu"
    :aria-label="t('common.columns')"
  >
    <div class="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
      {{ t('common.columns') }}
    </div>
    <div class="space-y-0.5 px-1">
      <div
        v-for="(col, index) in orderedColumns"
        :key="col.sortKey"
        class="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-card-foreground hover:bg-accent group"
        :class="{
          'ring-1 ring-primary ring-inset bg-accent/50':
            dragOverIndex === index && dragFromIndex !== null
        }"
        @dragover="onDragOver($event, index)"
        @dragleave="onDragLeave"
        @drop="onDrop($event, index)"
      >
        <span
          draggable="true"
          class="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground touch-none"
          :class="{ 'opacity-50': dragFromIndex === index }"
          :aria-label="t('common.columns') + ' - ' + col.label"
          @dragstart="onDragStart($event, index)"
          @dragend="onDragEnd"
        >
          <GripVertical class="w-4 h-4" />
        </span>
        <label class="flex flex-1 min-w-0 cursor-pointer items-center gap-2" @click.stop>
          <input
            type="checkbox"
            :checked="isColumnVisible(col.sortKey)"
            class="rounded border-border shrink-0"
            :aria-label="t('common.columns') + ' - ' + col.label"
            @change="setColumnVisible(col.sortKey, ($event.target as HTMLInputElement).checked)"
          />
          <span class="flex-1 min-w-0 truncate">{{ col.label }}</span>
        </label>
        <button
          v-if="isColumnVisible(col.sortKey)"
          type="button"
          class="shrink-0 flex items-center gap-1 px-2 py-1 rounded border transition text-xs"
          :class="
            isColumnPinned(col.sortKey)
              ? 'border-primary bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary'
              : 'border-border text-muted-foreground hover:bg-muted hover:text-card-foreground'
          "
          :title="isColumnPinned(col.sortKey) ? t('common.unpin') : t('common.freezeColumn')"
          :aria-label="
            (isColumnPinned(col.sortKey) ? t('common.unpin') : t('common.freezeColumn')) +
            ' - ' +
            col.label
          "
          @click.stop="setColumnPinned(col.sortKey, !isColumnPinned(col.sortKey))"
        >
          <PinOff v-if="isColumnPinned(col.sortKey)" class="w-3.5 h-3.5" />
          <Pin v-else class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">{{
            isColumnPinned(col.sortKey) ? t('common.unpin') : t('common.pin')
          }}</span>
        </button>
      </div>
    </div>
    <div class="border-t border-border mt-1 pt-1 px-1">
      <button
        type="button"
        class="w-full px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent hover:text-card-foreground rounded transition"
        @click="resetPreferences"
      >
        {{ t('common.resetColumns') }}
      </button>
    </div>
  </div>
</template>
