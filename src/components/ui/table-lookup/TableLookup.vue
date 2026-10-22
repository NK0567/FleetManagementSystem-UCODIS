<script lang="ts" setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowRight, ChevronDown, ExternalLink, Lock, X } from '@lucide/vue'
import TableLookupModal, {
  type FetchFnParams,
  type FetchFnResult,
  type LookupItem,
  type TableLookupColumn
} from './TableLookupModal.vue'
import { SEARCH_DEBOUNCE_MS } from '@/core/app/searchTiming'
import { createLatestRequest, isCanceledRequest } from '@/core/utils/latestRequest'
import {
  anchoredDropdownStyle,
  computeAnchoredDropdownPosition,
  type AnchoredDropdownPosition
} from '@/utils/anchoredDropdownPosition'

export type { TableLookupColumn } from './TableLookupModal.vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    items?: LookupItem[]
    columns: TableLookupColumn[]
    valueKey?: string
    displayFormat?: (item: LookupItem) => string
    placeholder?: string
    /** Adds a "select from full list" action opening a modal with this title. */
    fullListTitle?: string
    /** Server mode: items are searched through this function instead of `items`. */
    fetchFn?: (params: FetchFnParams) => Promise<FetchFnResult>
    pageSize?: number
    disabled?: boolean
    invalid?: boolean
    showLockIcon?: boolean
    /** Shows a "New" action; the parent handles the `create` event. */
    canCreate?: boolean
    /** Shows a "Show details" action; the parent handles the `show-details` event. */
    canShowDetails?: boolean
  }>(),
  {
    items: () => [],
    valueKey: 'code',
    placeholder: '',
    fullListTitle: '',
    pageSize: 20,
    disabled: false,
    invalid: false,
    showLockIcon: false,
    canCreate: false,
    canShowDetails: false
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  select: [item: LookupItem]
  create: []
  'show-details': [code: string]
}>()

const { t } = useI18n()

const DROPDOWN_ESTIMATED_HEIGHT = 300

const isOpen = ref(false)
const isModalOpen = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)
const dropdownPosition = ref<AnchoredDropdownPosition>(
  computeAnchoredDropdownPosition({
    triggerRect: { top: 0, bottom: 0, left: 0, width: 280 },
    estimatedHeight: DROPDOWN_ESTIMATED_HEIGHT,
    minWidth: 1
  })
)
const searchQuery = ref('')
const loadedItems = ref<LookupItem[]>([])
const loading = ref(false)
const searchRequest = createLatestRequest()
let searchDebounce: ReturnType<typeof setTimeout> | null = null

const isServerMode = computed(() => !!props.fetchFn)
const valueOf = (item: LookupItem) => String(item[props.valueKey] ?? '')

async function fetchFirstPage(query: string) {
  if (!props.fetchFn) return
  const request = searchRequest.start()
  loading.value = true
  try {
    const result = await props.fetchFn({
      page: 1,
      pageSize: props.pageSize,
      searchQuery: query.trim() || undefined,
      signal: request.signal
    })
    if (request.isCurrent()) loadedItems.value = result.items
  } catch (error) {
    if (!isCanceledRequest(error) && request.isCurrent()) loadedItems.value = []
  } finally {
    if (request.isCurrent()) loading.value = false
  }
}

const selectedItem = computed(() => {
  if (!props.modelValue) return undefined
  return [...loadedItems.value, ...props.items].find((item) => valueOf(item) === props.modelValue)
})

const displayText = computed(() => {
  if (!selectedItem.value) return props.modelValue
  return props.displayFormat ? props.displayFormat(selectedItem.value) : valueOf(selectedItem.value)
})

const dropdownItems = computed(() => {
  if (isServerMode.value) return loadedItems.value
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return props.items
  return props.items.filter((item) =>
    props.columns.some((column) =>
      String(item[column.key] ?? '')
        .toLowerCase()
        .includes(query)
    )
  )
})

const inputValue = computed(() => (isOpen.value ? searchQuery.value : displayText.value))
const hasFooter = computed(() => !!props.fullListTitle || props.canCreate || props.canShowDetails)
const detailsAvailable = computed(() => props.canShowDetails && !!props.modelValue)

watch(searchQuery, (query) => {
  if (!isServerMode.value || !isOpen.value) return
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => void fetchFirstPage(query), SEARCH_DEBOUNCE_MS)
})

function scrollToSelected() {
  void nextTick(() =>
    dropdownRef.value?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  )
}

function open() {
  if (props.disabled) return
  if (!isOpen.value) searchQuery.value = ''
  isOpen.value = true
  if (isServerMode.value) void fetchFirstPage('')
  scrollToSelected()
}

function toggle() {
  if (isOpen.value) isOpen.value = false
  else open()
}

function onInput(event: Event) {
  searchQuery.value = (event.target as HTMLInputElement).value
  if (!isOpen.value) isOpen.value = true
  scrollToSelected()
}

function selectItem(item: LookupItem) {
  emit('update:modelValue', valueOf(item))
  emit('select', item)
  searchQuery.value = ''
  isOpen.value = false
}

function clearSelection() {
  emit('update:modelValue', '')
  searchQuery.value = ''
  isOpen.value = false
}

function openFullList() {
  isOpen.value = false
  isModalOpen.value = true
}

function requestCreate() {
  isOpen.value = false
  isModalOpen.value = false
  emit('create')
}

function requestDetails() {
  if (!detailsAvailable.value) return
  isOpen.value = false
  emit('show-details', props.modelValue)
}

function updateDropdownPosition() {
  if (!triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  const width = Math.max(1, rect.width)
  dropdownPosition.value = {
    ...computeAnchoredDropdownPosition({
      triggerRect: rect,
      estimatedHeight: DROPDOWN_ESTIMATED_HEIGHT,
      minWidth: width,
      viewportPadding: 0
    }),
    left: rect.left,
    width
  }
}

watch(isOpen, (value) => {
  if (value) void nextTick(updateDropdownPosition)
})

function onClickOutside(event: MouseEvent) {
  const target = event.target as Node
  if (!triggerRef.value?.contains(target) && !dropdownRef.value?.contains(target)) {
    isOpen.value = false
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !isOpen.value) return
  isOpen.value = false
  searchQuery.value = ''
}

onMounted(() => {
  document.addEventListener('mousedown', onClickOutside)
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', onClickOutside)
  document.removeEventListener('keydown', onKeydown)
  if (searchDebounce) clearTimeout(searchDebounce)
  searchRequest.cancel()
})
</script>

<template>
  <div class="relative w-full min-w-0">
    <div
      ref="triggerRef"
      class="w-full flex items-center min-w-0 h-9 border rounded text-sm text-card-foreground transition"
      :class="[
        invalid
          ? 'border-destructive focus-within:border-destructive'
          : 'border-border focus-within:border-primary',
        disabled ? 'bg-muted/30 opacity-70' : 'bg-card',
        showLockIcon && 'pr-8'
      ]"
    >
      <input
        type="text"
        :value="inputValue"
        :placeholder="placeholder"
        :disabled="disabled"
        autocomplete="off"
        class="flex-1 min-w-0 h-full px-3 py-1.5 bg-transparent border-0 rounded text-inherit placeholder:text-muted-foreground focus:outline-none focus:ring-0 disabled:cursor-not-allowed"
        @input="onInput"
        @focus="open"
      />
      <button
        v-if="detailsAvailable"
        type="button"
        class="shrink-0 h-full px-2 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted/30"
        :title="t('common.lookup.showDetails')"
        :aria-label="t('common.lookup.showDetails')"
        @click.stop.prevent="requestDetails"
      >
        <ExternalLink class="w-3.5 h-3.5" />
      </button>
      <button
        v-if="modelValue && !disabled"
        type="button"
        class="shrink-0 h-full px-2 flex items-center justify-center text-muted-foreground hover:text-card-foreground hover:bg-muted/30"
        :aria-label="t('common.lookup.clear')"
        @click.stop.prevent="clearSelection"
      >
        <X class="w-4 h-4" />
      </button>
      <button
        type="button"
        class="shrink-0 h-full px-2 flex items-center justify-center text-muted-foreground hover:bg-muted/30 rounded-r disabled:pointer-events-none"
        :disabled="disabled"
        :aria-label="t('common.lookup.open')"
        @click.prevent="toggle"
      >
        <ChevronDown class="w-4 h-4 transition-transform" :class="isOpen && 'rotate-180'" />
      </button>
    </div>
    <Lock
      v-if="showLockIcon"
      class="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
    />

    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="dropdownRef"
        class="fixed z-100 bg-card border border-border shadow-lg overflow-hidden flex flex-col"
        :style="anchoredDropdownStyle(dropdownPosition)"
      >
        <div class="max-h-55 min-h-0 flex-1 overflow-y-auto">
          <table class="w-full text-sm table-fixed">
            <thead>
              <tr class="border-b border-border bg-muted/40 sticky top-0">
                <th class="w-8 px-2 py-1.5"></th>
                <th
                  v-for="column in columns"
                  :key="column.key"
                  class="px-3 py-1.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap"
                  :style="column.width ? { width: column.width } : {}"
                >
                  {{ column.label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in dropdownItems"
                :key="valueOf(item)"
                :data-selected="valueOf(item) === modelValue"
                class="cursor-pointer transition-colors border-b border-border/50 text-card-foreground"
                :class="valueOf(item) === modelValue ? 'bg-primary/10' : 'hover:bg-accent'"
                @click="selectItem(item)"
              >
                <td class="w-8 px-2 py-1.5 text-center">
                  <ArrowRight
                    v-if="valueOf(item) === modelValue"
                    class="w-4 h-4 text-primary inline-block"
                  />
                </td>
                <td
                  v-for="column in columns"
                  :key="column.key"
                  class="px-3 py-1.5 whitespace-nowrap overflow-hidden text-ellipsis"
                  :class="column.key === valueKey && 'font-medium text-primary'"
                >
                  {{ item[column.key] ?? '' }}
                </td>
              </tr>
              <tr v-if="loading">
                <td
                  :colspan="columns.length + 1"
                  class="px-3 py-4 text-center text-muted-foreground text-sm"
                >
                  {{ t('common.loading') }}
                </td>
              </tr>
              <tr v-else-if="dropdownItems.length === 0">
                <td
                  :colspan="columns.length + 1"
                  class="px-3 py-4 text-center text-muted-foreground text-sm"
                >
                  {{ searchQuery.trim() ? t('common.noResults') : t('common.lookup.noItems') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-if="hasFooter"
          class="shrink-0 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-3 py-2 text-xs border-t border-border bg-muted/20"
        >
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 min-w-0">
            <button
              v-if="canCreate"
              type="button"
              class="text-primary hover:underline whitespace-nowrap disabled:opacity-50"
              :disabled="disabled"
              @mousedown.stop.prevent="requestCreate"
            >
              {{ t('common.new') }}
            </button>
            <button
              v-if="canShowDetails"
              type="button"
              class="whitespace-nowrap"
              :class="
                detailsAvailable ? 'text-primary hover:underline' : 'text-muted-foreground/60'
              "
              :disabled="!detailsAvailable"
              @mousedown.stop.prevent="requestDetails"
            >
              {{ t('common.lookup.showDetails') }}
            </button>
          </div>
          <button
            v-if="fullListTitle"
            type="button"
            class="text-primary hover:underline whitespace-nowrap ml-auto"
            @mousedown.stop.prevent="openFullList"
          >
            {{ t('common.lookup.selectFromFullList') }}
          </button>
        </div>
      </div>
    </Teleport>

    <TableLookupModal
      v-if="fullListTitle"
      v-model:visible="isModalOpen"
      :title="fullListTitle"
      :items="items"
      :columns="columns"
      :value-key="valueKey"
      :model-value="modelValue"
      :fetch-fn="fetchFn"
      :page-size="pageSize"
      @select="selectItem"
    >
      <template v-if="canCreate" #header-actions>
        <button
          type="button"
          class="h-9 px-3 text-sm font-medium bg-primary text-primary-foreground rounded hover:opacity-90 transition"
          @click="requestCreate"
        >
          {{ t('common.new') }}
        </button>
      </template>
    </TableLookupModal>
  </div>
</template>
