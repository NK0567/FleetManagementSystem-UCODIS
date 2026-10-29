<script lang="ts" setup>
import { computed, ref, useSlots } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'

/**
 * A list inside a record, shown like the main lists (same header, sortable columns) and
 * narrowed without leaving the record: a search over what is displayed and, for the columns
 * marked `filter`, a choice among the values present. Long lists inside a record stay usable.
 */
export interface SubListColumn extends TableColumn {
  /** Offers a choice among the values of this column. */
  filter?: boolean
}

type Row = Record<string, unknown>

const props = withDefaults(
  defineProps<{
    rows: readonly Row[]
    columns: SubListColumn[]
    rowKey: string | ((row: Row, index: number) => string)
    emptyText: string
    /** The toolbar appears above this many rows; a short list needs no search. */
    filterFrom?: number
    /** Rows open something on click (the row-click event is sent). */
    clickable?: boolean
    initialSort?: { key: string; direction: 'ASC' | 'DESC' } | null
    rowClass?: (row: Row) => string
  }>(),
  { filterFrom: 4, clickable: false, initialSort: null, rowClass: undefined }
)
const emit = defineEmits<{ 'row-click': [row: Row] }>()
const slots = useSlots()

const { t } = useI18n()
const query = ref('')
const choices = ref<Record<string, string>>({})
const sortBy = ref<string | null>(props.initialSort?.key ?? null)
const sortDirection = ref<'ASC' | 'DESC'>(props.initialSort?.direction ?? 'ASC')

const keyOf = (row: Row, index: number) =>
  typeof props.rowKey === 'function' ? props.rowKey(row, index) : String(row[props.rowKey])

const valueOf = (row: Row, column: SubListColumn) => row[column.field ?? column.sortKey]

/** What the user reads in the cell: the search and the choices work on that. */
function textOf(row: Row, column: SubListColumn): string {
  const value = valueOf(row, column)
  if (column.formatter) return column.formatter(value, row)
  return value === null || value === undefined || value === '' ? '-' : String(value)
}

const filterColumns = computed(() => props.columns.filter((column) => column.filter))
const optionsOf = (column: SubListColumn) =>
  [...new Set(props.rows.map((row) => textOf(row, column)))].sort((a, b) => a.localeCompare(b))

const shown = computed(() => {
  const q = query.value.trim().toLowerCase()
  const kept = props.rows.filter((row) => {
    for (const column of filterColumns.value) {
      const wanted = choices.value[column.sortKey]
      if (wanted && textOf(row, column) !== wanted) return false
    }
    if (!q) return true
    return props.columns.some((column) => textOf(row, column).toLowerCase().includes(q))
  })
  const column = props.columns.find((item) => item.sortKey === sortBy.value)
  if (!column) return kept
  const sign = sortDirection.value === 'ASC' ? 1 : -1
  return [...kept].sort((a, b) => {
    const left = valueOf(a, column)
    const right = valueOf(b, column)
    if (typeof left === 'number' && typeof right === 'number') return (left - right) * sign
    return (
      String(left ?? '').localeCompare(String(right ?? ''), undefined, { numeric: true }) * sign
    )
  })
})

const active = computed(
  () => !!query.value || Object.values(choices.value).some((value) => !!value)
)
function clear() {
  query.value = ''
  choices.value = {}
}
function onSort(key: string, direction: 'ASC' | 'DESC') {
  if (key === '__actions') return
  sortBy.value = key
  sortDirection.value = direction
}

const hasActions = computed(() => !!slots.actions)
/* The actions column has an empty header so that the borders line up. */
const headerColumns = computed<TableColumn[]>(() =>
  hasActions.value ? [...props.columns, { sortKey: '__actions', label: '' }] : props.columns
)
const columnCount = computed(() => props.columns.length + (hasActions.value ? 1 : 0))
const cellClass = 'px-2 py-1.5 text-card-foreground min-w-0 text-xs lg:text-sm align-top'
</script>

<template>
  <div class="min-w-0">
    <div
      v-if="rows.length >= filterFrom || $slots.toolbar"
      class="flex flex-wrap items-center gap-2 mb-2"
    >
      <template v-if="rows.length >= filterFrom">
        <input
          v-model="query"
          type="search"
          class="h-8 flex-1 min-w-40 max-w-72 px-2.5 text-sm border border-border rounded bg-background outline-none focus:border-primary"
          :placeholder="t('common.subList.search')"
          :aria-label="t('common.subList.search')"
        />
        <select
          v-for="column in filterColumns"
          :key="column.sortKey"
          v-model="choices[column.sortKey]"
          class="h-8 px-2 text-sm border border-border rounded bg-background max-w-56"
          :aria-label="column.label"
        >
          <option :value="undefined">{{ column.label }} · {{ t('common.subList.all') }}</option>
          <option v-for="option in optionsOf(column)" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
        <button
          v-if="active"
          type="button"
          class="cursor-pointer h-8 px-2 text-xs text-muted-foreground hover:text-card-foreground"
          @click="clear"
        >
          {{ t('common.subList.clear') }}
        </button>
      </template>
      <span class="ml-auto flex items-center gap-2">
        <span v-if="rows.length >= filterFrom" class="text-xs text-muted-foreground tabular-nums">
          {{ t('common.subList.count', { shown: shown.length, total: rows.length }) }}
        </span>
        <slot name="toolbar" />
      </span>
    </div>
    <div class="border border-border rounded overflow-x-auto">
      <table class="w-full text-sm">
        <SortableTableHeader
          :columns="headerColumns"
          :sort-by="sortBy"
          :sort-direction="sortDirection"
          @sort="onSort"
        />
        <tbody class="divide-y divide-border">
          <tr v-if="!shown.length">
            <td :colspan="columnCount" class="px-3 py-4 text-sm text-muted-foreground">
              {{ rows.length ? t('common.subList.noMatch') : emptyText }}
            </td>
          </tr>
          <tr
            v-for="(row, index) in shown"
            :key="keyOf(row, index)"
            class="transition-colors"
            :class="[clickable ? 'cursor-pointer hover:bg-accent' : '', rowClass?.(row) ?? '']"
            @click="clickable && emit('row-click', row)"
          >
            <td
              v-for="column in columns"
              :key="column.sortKey"
              :class="[cellClass, column.align === 'right' ? 'text-right tabular-nums' : '']"
            >
              <slot
                :name="`cell-${column.sortKey}`"
                :row="row"
                :value="valueOf(row, column)"
                :text="textOf(row, column)"
              >
                {{ textOf(row, column) }}
              </slot>
            </td>
            <td v-if="hasActions" class="px-2 py-1 text-right whitespace-nowrap" @click.stop>
              <slot name="actions" :row="row" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
