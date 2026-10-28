<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronLeft, ChevronRight, Ellipsis } from '@lucide/vue'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    page: number
    totalPages: number
    total: number
    /** Already pluralized total, e.g. "24 employees". */
    countLabel?: string
    limit?: number
    pageSizeOptions?: number[]
    hidePageSize?: boolean
  }>(),
  {
    limit: 25,
    pageSizeOptions: () => [20, 25, 30, 50, 100],
    hidePageSize: false
  }
)

const emit = defineEmits<{
  'update:page': [page: number]
  'update:limit': [limit: number]
}>()

const hasPrev = computed(() => props.page > 1)
const hasNext = computed(() => props.page < props.totalPages)
const totalLabel = computed(
  () => props.countLabel ?? t('common.totalItems', { count: props.total }, props.total)
)

const pageSlots = computed(() => {
  const total = props.totalPages
  const current = props.page
  if (total <= 0) return []
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const slots: (number | 'ellipsis')[] = []
  slots.push(1)
  const windowStart = Math.max(2, current - 1)
  const windowEnd = Math.min(total - 1, current + 1)
  if (windowStart > 2) slots.push('ellipsis')
  for (let p = windowStart; p <= windowEnd; p++) {
    if (p !== 1 && p !== total) slots.push(p)
  }
  if (windowEnd < total - 1) slots.push('ellipsis')
  if (total > 1) slots.push(total)
  return slots
})

function goToPage(p: number) {
  const page = Math.max(1, Math.min(p, props.totalPages))
  if (page !== props.page) emit('update:page', page)
}

function prevPage() {
  if (hasPrev.value) emit('update:page', props.page - 1)
}

function nextPage() {
  if (hasNext.value) emit('update:page', props.page + 1)
}

function onPageSizeChange(e: Event) {
  const val = Number((e.target as HTMLSelectElement).value)
  if (val > 0 && val !== props.limit) emit('update:limit', val)
}
</script>

<template>
  <div
    class="border-t border-border px-4 py-3 bg-background flex flex-wrap items-center justify-between gap-3"
  >
    <div class="flex items-center gap-4">
      <span class="text-xs text-muted-foreground">
        {{ totalLabel }}
      </span>
      <label v-if="!hidePageSize" class="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{{ t('common.itemsPerPage') }}</span>
        <select
          :value="limit"
          class="h-8 min-w-16 rounded border border-border bg-background px-2 py-1 text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          @change="onPageSizeChange"
        >
          <option v-for="opt in pageSizeOptions" :key="opt" :value="opt">
            {{ opt }}
          </option>
        </select>
      </label>
    </div>
    <div class="flex items-center gap-1">
      <button
        type="button"
        :aria-label="t('common.previousPage')"
        :disabled="!hasPrev"
        class="inline-flex h-8 w-8 items-center justify-center rounded border border-border text-sm hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
        @click="prevPage"
      >
        <ChevronLeft class="w-4 h-4" />
      </button>
      <template v-for="(slot, i) in pageSlots" :key="i">
        <button
          v-if="slot === 'ellipsis'"
          type="button"
          class="h-8 min-w-8 px-1.5 rounded text-sm text-muted-foreground cursor-default"
          disabled
        >
          <Ellipsis class="w-4 h-4" />
        </button>
        <button
          v-else
          type="button"
          :class="[
            'h-8 min-w-8 rounded text-sm font-medium transition hover:bg-accent cursor-pointer',
            page === slot ? 'text-primary font-semibold' : 'text-muted-foreground'
          ]"
          @click="goToPage(slot)"
        >
          {{ slot }}
        </button>
      </template>
      <button
        type="button"
        :aria-label="t('common.nextPage')"
        :disabled="!hasNext"
        class="inline-flex h-8 w-8 items-center justify-center rounded border border-border text-sm hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
        @click="nextPage"
      >
        <ChevronRight class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>
