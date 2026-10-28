<script lang="ts" setup>
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, type RouteLocationRaw } from 'vue-router'
import { ArrowRight, ChevronDown, ExternalLink } from '@lucide/vue'
import type { SearchColumnOption } from '@/components/shared/SearchBar.vue'
import type { SublistFetchParams, SublistFetchResult } from '@/components/shared/SublistModal.vue'
import { SEARCH_DEBOUNCE_MS } from '@/core/app/searchTiming'
import { createLatestRequest, isCanceledRequest } from '@/core/utils/latestRequest'
import {
  anchoredDropdownStyle,
  computeAnchoredDropdownPosition,
  type AnchoredDropdownPosition
} from '@/utils/anchoredDropdownPosition'
import type { FetchFnParams, FetchFnResult, TableLookupColumn } from './TableLookupModal.vue'

type AnyItem = Record<string, unknown>

const props = withDefaults(
  defineProps<{
    code: string
    /** Label of the chosen record, shown in the second half of the field. */
    name: string
    label?: string
    columns: TableLookupColumn[]
    /** Columns of the full-list modal; the dropdown keeps `columns`. */
    modalColumns?: TableLookupColumn[]
    modalSearchColumnOptions?: SearchColumnOption[]
    modalPreferencesTableId?: string
    valueKey?: string
    nameKey?: string
    fetchFn: (params: FetchFnParams) => Promise<FetchFnResult>
    modalTitle: string
    pageSize?: number
    dropdownPageSize?: number
    placeholder?: string
    title?: string
    /** Preloads the dropdown list on mount. */
    fetchOnMount?: boolean
    /** Minimum characters before a search is sent. */
    searchMinLength?: number
    /** Searches only on Enter (no debounce, no fetch on open). */
    searchOnEnter?: boolean
    required?: boolean
    invalid?: boolean
    disabled?: boolean
    /** Page of the chosen record, opened by the details button. */
    detailRouteBuilder?: (code: string) => RouteLocationRaw | string | null
    detailsInNewTab?: boolean
  }>(),
  {
    label: undefined,
    modalColumns: undefined,
    modalSearchColumnOptions: undefined,
    modalPreferencesTableId: undefined,
    valueKey: 'no',
    nameKey: 'name',
    pageSize: 50,
    dropdownPageSize: 20,
    placeholder: '',
    title: '',
    fetchOnMount: true,
    searchMinLength: 0,
    searchOnEnter: false,
    required: false,
    invalid: false,
    disabled: false,
    detailRouteBuilder: undefined,
    detailsInNewTab: false
  }
)

const emit = defineEmits<{
  'update:code': [value: string]
  'update:name': [value: string]
  select: [item: AnyItem]
  'show-details': [payload: { code: string; preventDefault: () => void }]
}>()

const { t } = useI18n()
const router = useRouter()

const modalColumnsResolved = computed(() =>
  props.modalColumns?.length ? props.modalColumns : props.columns
)

const modalSearchColumnOptionsResolved = computed(() =>
  props.modalSearchColumnOptions?.length
    ? props.modalSearchColumnOptions
    : modalColumnsResolved.value.map((column) => ({ value: column.key, label: column.label }))
)

const modalPreferencesTableIdResolved = computed(
  () => props.modalPreferencesTableId ?? `lookup-modal-${props.valueKey}`
)

const modalFetchFn = (params: SublistFetchParams): Promise<SublistFetchResult> =>
  props.fetchFn({
    page: params.page,
    pageSize: params.pageSize,
    searchQuery: params.searchQuery,
    searchColumn: params.searchColumn,
    sortBy: params.sortBy,
    sortDirection: params.sortDirection,
    signal: params.signal
  })

const detailRoute = computed(() =>
  props.code && props.detailRouteBuilder ? props.detailRouteBuilder(props.code) : null
)
const canShowDetails = computed(() => !!props.code && detailRoute.value !== null)

const dropdownOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)
const wrapperRef = ref<HTMLElement | null>(null)
const fieldRef = ref<HTMLElement | null>(null)
/** About 220px of list plus the footer actions. */
const DROPDOWN_ESTIMATED_HEIGHT = 300
const dropdownPosition = ref<AnchoredDropdownPosition>(
  computeAnchoredDropdownPosition({
    triggerRect: { top: 0, bottom: 0, left: 0, width: 280 },
    estimatedHeight: DROPDOWN_ESTIMATED_HEIGHT,
    minWidth: 1
  })
)
const listItems = ref<AnyItem[]>([])
const dropdownLoading = ref(false)
const displayName = ref(props.name)
const searchQuery = ref('')
const hasAttemptedSearch = ref(false)
let searchDebounce: ReturnType<typeof setTimeout> | null = null
const dropdownRequest = createLatestRequest()

const requiresTypedSearch = computed(() => props.searchOnEnter || props.searchMinLength > 0)

const emptyDropdownMessage = computed(() =>
  requiresTypedSearch.value && !hasAttemptedSearch.value
    ? t(
        'common.lookup.searchMinLengthHint',
        { min: Math.max(props.searchMinLength, 1) },
        Math.max(props.searchMinLength, 1)
      )
    : t('common.lookup.noItems')
)

const valueOf = (item: AnyItem) => String(item[props.valueKey] ?? '')
const nameOf = (item: AnyItem) => String(item[props.nameKey] ?? '')

function queryMeetsMinLength(query: string): boolean {
  return query.trim().length >= props.searchMinLength
}

watch(
  () => props.name,
  (name) => {
    displayName.value = name
  }
)

function loadDropdownItems(query?: string) {
  const search = (query ?? searchQuery.value).trim()
  if (requiresTypedSearch.value && !queryMeetsMinLength(search)) {
    listItems.value = []
    hasAttemptedSearch.value = false
    dropdownLoading.value = false
    return
  }
  const request = dropdownRequest.start()
  hasAttemptedSearch.value = true
  dropdownLoading.value = true
  props
    .fetchFn({
      page: 1,
      pageSize: props.dropdownPageSize,
      searchQuery: search || undefined,
      signal: request.signal
    })
    .then(({ items }) => {
      if (request.isCurrent()) listItems.value = items
    })
    .catch((error: unknown) => {
      if (isCanceledRequest(error) || !request.isCurrent()) return
      listItems.value = []
    })
    .finally(() => {
      if (request.isCurrent()) dropdownLoading.value = false
    })
}

function resetTypedSearchState() {
  listItems.value = []
  hasAttemptedSearch.value = false
  dropdownLoading.value = false
  dropdownRequest.cancel()
}

watch(searchQuery, (query) => {
  if (props.searchOnEnter) {
    if (!query.trim()) resetTypedSearchState()
    return
  }
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    if (dropdownOpen.value) loadDropdownItems()
  }, SEARCH_DEBOUNCE_MS)
})

function updateDropdownPosition() {
  const element = fieldRef.value ?? wrapperRef.value
  if (!element) return
  const rect = element.getBoundingClientRect()
  const fieldWidth = Math.max(1, rect.width)
  const position = computeAnchoredDropdownPosition({
    triggerRect: rect,
    estimatedHeight: DROPDOWN_ESTIMATED_HEIGHT,
    minWidth: fieldWidth,
    viewportPadding: 0
  })
  dropdownPosition.value = { ...position, left: rect.left, width: fieldWidth }
}

function scrollToSelected() {
  void nextTick(() =>
    dropdownRef.value
      ?.querySelector('[data-lookup-selected="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  )
}

function openDropdown() {
  searchQuery.value = ''
  dropdownOpen.value = true
  if (requiresTypedSearch.value) resetTypedSearchState()
  else loadDropdownItems()
  void nextTick(updateDropdownPosition)
  scrollToSelected()
}

function toggleDropdown() {
  if (props.disabled) return
  if (dropdownOpen.value) dropdownOpen.value = false
  else openDropdown()
}

function onInputFocus() {
  if (!props.disabled && !dropdownOpen.value) openDropdown()
}

function onInputKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || !requiresTypedSearch.value) return
  event.preventDefault()
  event.stopPropagation()
  if (searchDebounce) {
    clearTimeout(searchDebounce)
    searchDebounce = null
  }
  if (!dropdownOpen.value) {
    dropdownOpen.value = true
    void nextTick(updateDropdownPosition)
  }
  const query = searchQuery.value.trim()
  if (!queryMeetsMinLength(query)) {
    resetTypedSearchState()
    return
  }
  loadDropdownItems(query)
}

/** Typing opens the list; the debounced watcher loads it, not every keystroke. */
function onInputInput(event: Event) {
  searchQuery.value = (event.target as HTMLInputElement).value
  if (!dropdownOpen.value) dropdownOpen.value = true
  scrollToSelected()
}

function applySelection(item: AnyItem) {
  emit('update:code', valueOf(item))
  emit('update:name', nameOf(item))
  emit('select', item)
  displayName.value = nameOf(item)
}

function selectItem(item: AnyItem) {
  applySelection(item)
  searchQuery.value = ''
  dropdownOpen.value = false
}

const modalOpen = ref(false)

function openFullList() {
  if (props.disabled) return
  dropdownOpen.value = false
  modalOpen.value = true
}

function onModalSelect(item: AnyItem) {
  applySelection(item)
  modalOpen.value = false
}

function openDetails() {
  if (!canShowDetails.value) return
  let prevented = false
  emit('show-details', {
    code: props.code,
    preventDefault: () => {
      prevented = true
    }
  })
  dropdownOpen.value = false
  const target = detailRoute.value
  if (prevented || !target) return
  if (props.detailsInNewTab) {
    window.open(router.resolve(target).href, '_blank', 'noopener')
    return
  }
  void router.push(target)
}

function clearSelection() {
  emit('update:code', '')
  emit('update:name', '')
  displayName.value = ''
}

function onClickOutside(event: MouseEvent) {
  if (wrapperRef.value?.contains(event.target as Node)) return
  if (dropdownRef.value?.contains(event.target as Node)) return
  dropdownOpen.value = false
  searchQuery.value = ''
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  dropdownOpen.value = false
  searchQuery.value = ''
}

function onScrollOrResize() {
  if (dropdownOpen.value) updateDropdownPosition()
}

onMounted(() => {
  document.addEventListener('mousedown', onClickOutside)
  document.addEventListener('keydown', onKeydown)
  window.addEventListener('scroll', onScrollOrResize, true)
  window.addEventListener('resize', onScrollOrResize)
  if (props.fetchOnMount && !requiresTypedSearch.value) loadDropdownItems()
})

onUnmounted(() => {
  document.removeEventListener('mousedown', onClickOutside)
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('scroll', onScrollOrResize, true)
  window.removeEventListener('resize', onScrollOrResize)
  if (searchDebounce) clearTimeout(searchDebounce)
  dropdownRequest.cancel()
})
</script>

<template>
  <div ref="wrapperRef" class="relative" :class="{ 'opacity-70': disabled }">
    <label v-if="label" class="block text-sm text-muted-foreground mb-1">
      <span v-if="required" class="text-destructive">*&nbsp;</span>
      {{ label }}
    </label>
    <div
      ref="fieldRef"
      class="grid grid-cols-[1fr_1fr_auto_auto_auto] rounded border overflow-hidden bg-card"
      :class="invalid ? 'border-destructive' : 'border-border'"
    >
      <input
        :value="dropdownOpen ? searchQuery : code"
        type="text"
        class="min-w-0 w-full px-3 py-1.5 border-0 bg-card text-sm rounded-none focus:ring-0 focus:outline-none disabled:cursor-not-allowed"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="disabled"
        @focus="onInputFocus"
        @input="onInputInput"
        @keydown="onInputKeydown"
      />
      <div
        class="min-w-0 px-3 py-1.5 bg-muted/30 text-muted-foreground text-sm flex items-center truncate"
      >
        {{ displayName || ' ' }}
      </div>
      <button
        v-if="canShowDetails"
        type="button"
        class="shrink-0 h-full px-2 bg-muted/30 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-accent cursor-pointer"
        :title="t('common.lookup.showDetails')"
        :aria-label="t('common.lookup.showDetails')"
        @click.stop.prevent="openDetails"
      >
        <ExternalLink class="w-3.5 h-3.5" />
      </button>
      <button
        v-if="(code || name) && !disabled"
        type="button"
        class="shrink-0 h-full px-2.5 bg-muted/30 flex items-center justify-center text-muted-foreground hover:text-card-foreground hover:bg-accent cursor-pointer"
        :aria-label="t('common.lookup.clear')"
        @click.stop.prevent="clearSelection"
      >
        ×
      </button>
      <button
        type="button"
        class="shrink-0 px-2 py-1.5 bg-muted/30 text-muted-foreground hover:bg-accent text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        :title="title || label || t('common.lookup.open')"
        :aria-label="title || label || t('common.lookup.open')"
        :disabled="disabled"
        @click="toggleDropdown"
      >
        <ChevronDown class="w-4 h-4" />
      </button>
    </div>

    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-150 ease-out"
        :enter-from-class="
          dropdownPosition.placement === 'above'
            ? 'opacity-0 translate-y-1'
            : 'opacity-0 -translate-y-1'
        "
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        :leave-to-class="
          dropdownPosition.placement === 'above'
            ? 'opacity-0 translate-y-1'
            : 'opacity-0 -translate-y-1'
        "
      >
        <div
          v-if="dropdownOpen"
          ref="dropdownRef"
          class="fixed z-9999 bg-card border border-border shadow-lg overflow-hidden flex flex-col"
          :style="anchoredDropdownStyle(dropdownPosition)"
        >
          <div class="max-h-55 min-h-0 flex-1 overflow-y-auto flex flex-col">
            <div v-if="dropdownLoading" class="flex-1 flex items-center justify-center py-8">
              <LoadingSpinner :size="20" />
            </div>
            <table v-else class="w-full text-sm table-fixed">
              <thead>
                <tr class="border-b border-border bg-muted sticky top-0">
                  <th class="w-8 px-2 py-1.5" />
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
                  v-for="item in listItems"
                  :key="valueOf(item)"
                  :data-lookup-selected="valueOf(item) === code"
                  class="cursor-pointer transition-colors border-b border-border/50 last:border-0 hover:bg-accent/50 text-card-foreground"
                  :class="valueOf(item) === code ? 'bg-primary/10' : ''"
                  @mousedown.stop.prevent="selectItem(item)"
                >
                  <td class="w-8 px-2 py-1.5 text-center">
                    <ArrowRight
                      v-if="valueOf(item) === code"
                      class="w-4 h-4 text-primary inline-block"
                    />
                  </td>
                  <td
                    v-for="column in columns"
                    :key="column.key"
                    class="px-3 py-1.5 whitespace-nowrap overflow-hidden text-ellipsis"
                    :class="column.key === valueKey ? 'font-medium text-primary' : ''"
                  >
                    {{ item[column.key] ?? '' }}
                  </td>
                </tr>
                <tr v-if="listItems.length === 0">
                  <td
                    :colspan="columns.length + 1"
                    class="px-3 py-4 text-center text-muted-foreground text-sm"
                  >
                    {{ emptyDropdownMessage }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div
            class="shrink-0 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-3 py-2 text-xs border-t border-border bg-muted/20"
          >
            <button
              v-if="detailRouteBuilder"
              type="button"
              class="whitespace-nowrap cursor-pointer disabled:cursor-not-allowed"
              :class="canShowDetails ? 'text-primary hover:underline' : 'text-muted-foreground/60'"
              :disabled="!canShowDetails"
              @mousedown.stop.prevent="openDetails"
            >
              {{ t('common.lookup.showDetails') }}
            </button>
            <button
              type="button"
              class="text-primary hover:underline whitespace-nowrap text-right cursor-pointer ml-auto"
              @mousedown.stop.prevent="openFullList"
            >
              {{ t('common.lookup.selectFromFullList') }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <SublistModal
      v-model:visible="modalOpen"
      :title="modalTitle"
      :columns="modalColumnsResolved"
      :fetch-fn="modalFetchFn"
      :page-size="pageSize"
      :search-column-options="modalSearchColumnOptionsResolved"
      :preferences-table-id="modalPreferencesTableIdResolved"
      :require-search="requiresTypedSearch"
      :search-min-length="searchMinLength"
      selectable
      :value-key="valueKey"
      :model-value="code"
      @select="onModalSelect"
    />
  </div>
</template>
