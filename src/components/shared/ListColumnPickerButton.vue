<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { LayoutList } from '@lucide/vue'
import TableColumnPicker from './TableColumnPicker.vue'
import type { TableColumn } from './SortableTableHeader.vue'

/** Standalone "Columns" button and popover, for lists that do not use ListPageToolbar. */
defineProps<{
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

const { t } = useI18n()
const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)

function onMousedown(e: MouseEvent) {
  const el = rootRef.value
  if (open.value && el && !el.contains(e.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('mousedown', onMousedown))
onUnmounted(() => document.removeEventListener('mousedown', onMousedown))
</script>

<template>
  <div ref="rootRef" class="relative shrink-0">
    <button
      type="button"
      class="p-1.5 rounded transition"
      :class="open ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'"
      :title="t('common.columns')"
      :aria-label="t('common.columns')"
      :aria-expanded="open"
      @click="open = !open"
    >
      <LayoutList class="w-4 h-4" />
    </button>
    <div v-show="open" class="absolute right-0 top-full z-50 mt-0.5" @click.stop>
      <TableColumnPicker
        :all-columns="allColumns"
        :order-sort-keys="orderSortKeys"
        :visible-sort-keys="visibleSortKeys"
        :pinned-sort-keys="pinnedSortKeys"
        :is-column-visible="isColumnVisible"
        :is-column-pinned="isColumnPinned"
        :set-column-visible="setColumnVisible"
        :set-column-pinned="setColumnPinned"
        :set-column-order="setColumnOrder"
        :reset-preferences="resetPreferences"
      />
    </div>
  </div>
</template>
