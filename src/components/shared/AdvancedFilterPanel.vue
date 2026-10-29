<script lang="ts" setup>
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, X } from '@lucide/vue'
import type { ListFilter, ListFilterOperator } from '@/core/types/crud.types'
import {
  allowsMultipleFilters,
  operatorWhenAddingFilter,
  operatorsForKind,
  type FilterOperatorFieldKind
} from '@/core/utils/filterOperators'
import { useOptionsStore } from '@/stores/optionsStore'
import { useReferenceStore } from '@/stores/referenceStore'
import type { EnrichOption } from '@/types/options.types'
import TableLookup from '@/components/ui/table-lookup/TableLookup.vue'
import type { TableLookupColumn } from '@/components/ui/table-lookup/TableLookup.vue'
import DateFormInput from '@/components/ui/input/DateFormInput.vue'
import {
  anchoredDropdownStyle,
  computeAnchoredDropdownPosition,
  type AnchoredDropdownPosition
} from '@/utils/anchoredDropdownPosition'

/**
 * Input modes: free input for text, number, date and boolean; multi-select checkboxes for
 * `option` (sent as IN); a lookup over the reference store for `reference`.
 */
export type FilterFieldKind = FilterOperatorFieldKind

export interface FilterFieldDef {
  field: string
  labelKey: string
  /** Already translated label, e.g. taken from the list columns. */
  label?: string
  valueType: ListFilter['valueType']
  kind: FilterFieldKind
  optionsKey?: string
  optionFilter?: (option: EnrichOption) => boolean
  referenceKey?: string
}

export interface ListViewOption {
  value: string
  label: string
}

const props = withDefaults(
  defineProps<{
    fields: FilterFieldDef[]
    modelValue: ListFilter[]
    /** Predefined views shown on top of the panel. */
    listViewOptions?: ListViewOption[]
    listView?: string
  }>(),
  {
    listViewOptions: () => [],
    listView: undefined
  }
)

const emit = defineEmits<{
  'update:modelValue': [filters: ListFilter[]]
  'update:listView': [value: string]
}>()

const { t } = useI18n()
const optionsStore = useOptionsStore()
const referenceStore = useReferenceStore()

const filters = computed<ListFilter[]>(() => props.modelValue ?? [])

const fieldLabel = (def: FilterFieldDef) => def.label ?? t(def.labelKey)

const rows = computed(() =>
  filters.value.flatMap((filter, index) => {
    const def = props.fields.find((candidate) => candidate.field === filter.field)
    return def ? [{ filter, index, def }] : []
  })
)

const availableFields = computed(() =>
  props.fields.filter(
    (def) =>
      allowsMultipleFilters(def.kind) || !filters.value.some((filter) => filter.field === def.field)
  )
)

const PICKER_MAX_HEIGHT = 288
const pickerOpen = ref(false)
const pickerTriggerRef = ref<HTMLElement | null>(null)
const pickerDropdownRef = ref<HTMLElement | null>(null)
const pickerSearch = ref('')
const pickerPosition = ref<AnchoredDropdownPosition | null>(null)

const filteredAvailableFields = computed(() => {
  const query = pickerSearch.value.trim().toLowerCase()
  if (!query) return availableFields.value
  return availableFields.value.filter((def) => fieldLabel(def).toLowerCase().includes(query))
})

function updatePickerPosition() {
  const trigger = pickerTriggerRef.value
  if (!trigger) return
  pickerPosition.value = computeAnchoredDropdownPosition({
    triggerRect: trigger.getBoundingClientRect(),
    estimatedHeight: PICKER_MAX_HEIGHT,
    minWidth: 240
  })
}

function togglePicker() {
  pickerOpen.value = !pickerOpen.value
  if (!pickerOpen.value) return
  pickerSearch.value = ''
  void nextTick(updatePickerPosition)
}

function onClickOutside(event: MouseEvent) {
  if (!pickerOpen.value) return
  const target = event.target as Node
  if (pickerTriggerRef.value?.contains(target) || pickerDropdownRef.value?.contains(target)) return
  pickerOpen.value = false
}

function onWindowChange() {
  if (pickerOpen.value) updatePickerPosition()
}

onMounted(() => {
  document.addEventListener('mousedown', onClickOutside)
  window.addEventListener('resize', onWindowChange)
  window.addEventListener('scroll', onWindowChange, true)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', onClickOutside)
  window.removeEventListener('resize', onWindowChange)
  window.removeEventListener('scroll', onWindowChange, true)
})

watch(
  () => props.fields.some((def) => def.kind === 'reference'),
  (needsReferences) => {
    if (needsReferences) void referenceStore.fetchAll()
  },
  { immediate: true }
)

function emitFilters(next: ListFilter[]) {
  emit('update:modelValue', next)
}

function addFilter(def: FilterFieldDef) {
  const existing = filters.value.filter((filter) => filter.field === def.field)
  const operator = operatorWhenAddingFilter(
    def.kind,
    existing.map((filter) => filter.operator)
  )
  emitFilters([
    ...filters.value,
    {
      field: def.field,
      valueType: def.valueType,
      value: def.kind === 'option' ? [] : '',
      ...(operator ? { operator } : {})
    }
  ])
  pickerOpen.value = false
}

function removeFilterAt(index: number) {
  emitFilters(filters.value.filter((_, position) => position !== index))
}

function updateFilterAt(index: number, patch: Partial<ListFilter>) {
  emitFilters(
    filters.value.map((filter, position) => (position === index ? { ...filter, ...patch } : filter))
  )
}

function selectedOptionKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String)
  return value === '' || value == null ? [] : [String(value)]
}

function toggleOption(index: number, filter: ListFilter, option: EnrichOption, checked: boolean) {
  const selected = selectedOptionKeys(filter.value)
  const key = String(option.value)
  const nextKeys = checked ? [...new Set([...selected, key])] : selected.filter((k) => k !== key)
  const values = optionsStore
    .getOptions(fieldOptionsKey(filter))
    .filter((candidate) => nextKeys.includes(String(candidate.value)))
    .map((candidate) => candidate.value)
  updateFilterAt(index, { value: values })
}

function fieldOptionsKey(filter: ListFilter): string {
  return props.fields.find((def) => def.field === filter.field)?.optionsKey ?? ''
}

function optionsFor(def: FilterFieldDef): EnrichOption[] {
  if (!def.optionsKey) return []
  const options = optionsStore.getOptions(def.optionsKey)
  return def.optionFilter ? options.filter(def.optionFilter) : options
}

function referenceColumns(def: FilterFieldDef): TableLookupColumn[] {
  return [
    { key: 'code', label: t('common.code'), width: '40%' },
    { key: 'description', label: fieldLabel(def), width: '60%' }
  ]
}

function referenceItems(def: FilterFieldDef) {
  return def.referenceKey ? referenceStore.getItems(def.referenceKey) : []
}

function referenceDisplay(item: Record<string, unknown>): string {
  const code = String(item.code ?? '')
  const description = String(item.description ?? '')
  return description ? `${code} · ${description}` : code
}

function inputValue(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'boolean') return value ? '1' : '0'
  return String(value)
}

function onNumberInput(index: number, event: Event) {
  const raw = (event.target as HTMLInputElement).value
  const number = Number(raw)
  updateFilterAt(index, { value: raw === '' || Number.isNaN(number) ? '' : number })
}

function onBooleanChange(index: number, event: Event) {
  const raw = (event.target as HTMLSelectElement).value
  updateFilterAt(index, { value: raw === '' ? '' : raw === '1' })
}

function operatorTitle(def: FilterFieldDef, filter: ListFilter): string {
  const current = operatorsForKind(def.kind).find((op) => op.value === (filter.operator ?? '='))
  return current ? t(current.labelKey) : t('common.filterOp.label')
}

const inputClass =
  'w-full h-8 px-2 border border-border rounded text-sm bg-card text-card-foreground focus:outline-none focus:border-primary'
</script>

<template>
  <div class="flex flex-col gap-3">
    <div
      v-if="listViewOptions.length > 0"
      class="flex flex-col gap-1 -mx-1 pb-3 border-b border-border"
    >
      <button
        v-for="view in listViewOptions"
        :key="view.value"
        type="button"
        class="w-full text-left text-sm px-1 py-1 rounded transition text-primary"
        :class="listView === view.value ? 'font-semibold underline' : 'hover:underline'"
        @click="emit('update:listView', view.value)"
      >
        <span v-if="view.value === 'all'" class="italic">*</span>{{ view.label }}
      </button>
    </div>

    <p class="text-xs text-muted-foreground">{{ t('common.filterBy') }}</p>

    <div v-if="rows.length > 0" class="flex flex-col gap-3">
      <div
        v-for="{ filter, index, def } in rows"
        :key="`${filter.field}:${index}`"
        class="flex flex-col gap-1"
      >
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="text-muted-foreground hover:text-destructive transition shrink-0"
            :title="t('common.remove')"
            :aria-label="t('common.remove')"
            @click="removeFilterAt(index)"
          >
            <X class="w-3.5 h-3.5" />
          </button>
          <span class="text-xs text-muted-foreground truncate">{{ fieldLabel(def) }}</span>
        </div>

        <div
          v-if="def.kind === 'option'"
          class="max-h-40 overflow-y-auto border border-border rounded bg-card"
        >
          <label
            v-for="option in optionsFor(def)"
            :key="String(option.value)"
            class="flex items-center gap-2 px-2 py-1.5 text-sm text-card-foreground hover:bg-muted/40 cursor-pointer"
          >
            <input
              type="checkbox"
              class="rounded border-border"
              :checked="selectedOptionKeys(filter.value).includes(String(option.value))"
              @change="
                (event) =>
                  toggleOption(index, filter, option, (event.target as HTMLInputElement).checked)
              "
            />
            <span class="truncate">{{ option.description }}</span>
          </label>
          <p v-if="optionsFor(def).length === 0" class="px-2 py-1.5 text-xs text-muted-foreground">
            -
          </p>
        </div>

        <div v-else class="flex items-stretch gap-1">
          <select
            v-if="operatorsForKind(def.kind).length > 0"
            class="h-8 shrink-0 max-w-22 px-1 border border-border rounded text-xs font-mono bg-card text-card-foreground focus:outline-none focus:border-primary"
            :value="filter.operator ?? '='"
            :title="operatorTitle(def, filter)"
            :aria-label="t('common.filterOp.label')"
            @change="
              (event) =>
                updateFilterAt(index, {
                  operator: (event.target as HTMLSelectElement).value as ListFilterOperator
                })
            "
          >
            <option
              v-for="operator in operatorsForKind(def.kind)"
              :key="operator.value"
              :value="operator.value"
              :title="t(operator.labelKey)"
            >
              {{ operator.symbol }}
            </option>
          </select>

          <div class="min-w-0 flex-1">
            <TableLookup
              v-if="def.kind === 'reference'"
              :model-value="inputValue(filter.value)"
              :items="referenceItems(def)"
              :columns="referenceColumns(def)"
              value-key="code"
              :display-format="referenceDisplay"
              placeholder="-"
              :full-list-title="fieldLabel(def)"
              @update:model-value="(value) => updateFilterAt(index, { value })"
            />

            <select
              v-else-if="def.kind === 'boolean'"
              :class="inputClass"
              :value="inputValue(filter.value)"
              @change="(event) => onBooleanChange(index, event)"
            >
              <option value="">-</option>
              <option value="1">{{ t('common.yes') }}</option>
              <option value="0">{{ t('common.no') }}</option>
            </select>

            <DateFormInput
              v-else-if="def.kind === 'date'"
              :class="inputClass"
              :model-value="inputValue(filter.value)"
              @update:model-value="(value) => updateFilterAt(index, { value })"
            />

            <input
              v-else-if="def.kind === 'number'"
              type="number"
              :class="inputClass"
              :value="inputValue(filter.value)"
              @input="(event) => onNumberInput(index, event)"
            />

            <input
              v-else
              type="text"
              :class="inputClass"
              :value="inputValue(filter.value)"
              @input="
                (event) =>
                  updateFilterAt(index, { value: (event.target as HTMLInputElement).value })
              "
            />
          </div>
        </div>
      </div>
    </div>

    <div>
      <button
        ref="pickerTriggerRef"
        type="button"
        class="flex items-center gap-1 text-sm text-primary hover:underline py-1 disabled:opacity-50"
        :aria-expanded="pickerOpen"
        :disabled="availableFields.length === 0"
        @click="togglePicker"
      >
        <Plus class="w-3.5 h-3.5" />
        {{ t('common.filterAction') }}
      </button>
    </div>

    <Teleport to="body">
      <div
        v-if="pickerOpen && pickerPosition && availableFields.length > 0"
        ref="pickerDropdownRef"
        class="fixed z-50 overflow-y-auto rounded border border-border bg-card py-1 shadow-lg"
        :style="anchoredDropdownStyle(pickerPosition)"
      >
        <div class="px-2 py-1">
          <input
            v-model="pickerSearch"
            type="text"
            class="w-full h-7 px-2 border border-border rounded text-xs bg-card text-card-foreground focus:outline-none focus:border-primary"
            :placeholder="t('common.search')"
          />
        </div>
        <button
          v-for="def in filteredAvailableFields"
          :key="def.field"
          type="button"
          class="w-full text-left px-3 py-1.5 text-sm text-card-foreground hover:bg-accent transition"
          @click="addFilter(def)"
        >
          {{ fieldLabel(def) }}
        </button>
        <div
          v-if="filteredAvailableFields.length === 0"
          class="px-3 py-2 text-xs text-muted-foreground"
        >
          -
        </div>
      </div>
    </Teleport>
  </div>
</template>
