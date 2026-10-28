<script lang="ts" setup>
import { ref, watch, nextTick, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowRight, LoaderCircle, Search, X } from '@lucide/vue'
import { createLatestRequest, isCanceledRequest } from '@/core/utils/latestRequest'

export interface TableLookupColumn {
  key: string
  label: string
  width?: string
}

export type LookupItem = Record<string, unknown>

export interface FetchFnParams {
  page: number
  pageSize: number
  searchQuery?: string
  searchColumn?: string
  sortBy?: string
  sortDirection?: 'ASC' | 'DESC'
  signal?: AbortSignal
}

export interface FetchFnResult {
  items: LookupItem[]
  meta: { total: number; page: number; totalPages: number }
}

const props = withDefaults(
  defineProps<{
    visible: boolean
    title?: string
    items?: LookupItem[]
    columns: TableLookupColumn[]
    valueKey?: string
    modelValue?: string
    fetchFn?: (params: FetchFnParams) => Promise<FetchFnResult>
    pageSize?: number
    refreshTrigger?: number
  }>(),
  {
    valueKey: 'code',
    modelValue: '',
    pageSize: 20
  }
)

const emit = defineEmits<{
  'update:visible': [value: boolean]
  select: [item: LookupItem]
  cancel: []
}>()

const { t } = useI18n()

const modalTitle = computed(() => props.title ?? t('common.lookup.selectTitle'))

const searchQuery = ref('')
const appliedQuery = ref('')
const selectedValue = ref(props.modelValue)
const loadedItems = ref<LookupItem[]>([])
const currentPage = ref(1)
const totalPages = ref(1)
const totalItems = ref(0)
const loading = ref(false)
const loadingMore = ref(false)
const scrollContainerRef = ref<HTMLElement | null>(null)

const lookupRequest = createLatestRequest()
const isServerMode = computed(() => !!props.fetchFn)

const valueOf = (item: LookupItem) => String(item[props.valueKey] ?? '')

async function fetchPage(page: number, query: string, append = false) {
  if (!props.fetchFn) return
  const request = lookupRequest.start()
  if (page === 1) loading.value = true
  else loadingMore.value = true

  try {
    const result = await props.fetchFn({
      page,
      pageSize: props.pageSize,
      searchQuery: query || undefined,
      signal: request.signal
    })
    if (!request.isCurrent()) return
    loadedItems.value = append ? [...loadedItems.value, ...result.items] : result.items
    currentPage.value = result.meta.page
    totalPages.value = result.meta.totalPages
    totalItems.value = result.meta.total
  } catch (error) {
    if (isCanceledRequest(error) || !request.isCurrent()) return
    loadedItems.value = []
  } finally {
    if (request.isCurrent()) {
      loading.value = false
      loadingMore.value = false
    }
  }
}

const displayItems = computed<LookupItem[]>(() => {
  if (isServerMode.value) return loadedItems.value
  const query = appliedQuery.value.toLowerCase()
  if (!query) return props.items ?? []
  return (props.items ?? []).filter((item) =>
    props.columns.some((column) =>
      String(item[column.key] ?? '')
        .toLowerCase()
        .includes(query)
    )
  )
})

function submitSearch() {
  appliedQuery.value = searchQuery.value
  if (isServerMode.value) {
    currentPage.value = 1
    void fetchPage(1, searchQuery.value)
  }
}

const SCROLL_THRESHOLD_PX = 50

function onScroll() {
  if (!isServerMode.value || loadingMore.value || loading.value) return
  if (currentPage.value >= totalPages.value) return
  const element = scrollContainerRef.value
  if (!element) return
  if (element.scrollHeight - element.scrollTop - element.clientHeight < SCROLL_THRESHOLD_PX) {
    void fetchPage(currentPage.value + 1, appliedQuery.value, true)
  }
}

function selectRow(item: LookupItem) {
  selectedValue.value = valueOf(item)
}

function confirmSelection() {
  const item = displayItems.value.find((candidate) => valueOf(candidate) === selectedValue.value)
  if (item) emit('select', item)
  emit('update:visible', false)
}

function cancel() {
  emit('cancel')
  emit('update:visible', false)
}

function onBackdropClick(event: MouseEvent) {
  if ((event.target as HTMLElement).dataset.backdrop) cancel()
}

watch(
  () => props.visible,
  async (isVisible) => {
    if (!isVisible) return
    selectedValue.value = props.modelValue
    searchQuery.value = ''
    appliedQuery.value = ''
    currentPage.value = 1
    if (isServerMode.value) await fetchPage(1, '')
    await nextTick()
    scrollContainerRef.value
      ?.querySelector('[data-modal-selected="true"]')
      ?.scrollIntoView({ block: 'center' })
  }
)

watch(
  () => props.refreshTrigger,
  () => {
    if (props.visible && isServerMode.value) void fetchPage(1, appliedQuery.value)
  }
)
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="visible"
        data-backdrop="true"
        class="fixed inset-0 z-100 flex items-center justify-center bg-black/50"
        @mousedown="onBackdropClick"
      >
        <div
          class="bg-card rounded-lg shadow-2xl border border-border w-full max-w-[min(96vw,90rem)] max-h-[80vh] flex flex-col overflow-hidden"
          @mousedown.stop
        >
          <div
            class="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30"
          >
            <div class="flex items-center gap-3">
              <h2 class="text-base font-semibold text-card-foreground">{{ modalTitle }}</h2>
              <span v-if="isServerMode && !loading" class="text-xs text-muted-foreground">
                {{ t('common.lookup.resultCount', { count: totalItems }, totalItems) }}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <slot name="header-actions" />
              <form class="relative flex items-center gap-1" @submit.prevent="submitSearch">
                <Search
                  class="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
                <input
                  v-model="searchQuery"
                  type="text"
                  :placeholder="t('common.lookup.searchPlaceholder')"
                  class="h-9 pl-8 pr-3 py-1.5 text-sm border border-border rounded bg-card text-card-foreground w-48 focus:outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  class="h-9 px-2.5 text-sm font-medium bg-primary text-primary-foreground rounded hover:opacity-90 transition"
                >
                  {{ t('common.search') }}
                </button>
              </form>
              <button
                type="button"
                class="p-1.5 hover:bg-accent rounded transition text-muted-foreground"
                :aria-label="t('common.close')"
                @click="cancel"
              >
                <X class="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            ref="scrollContainerRef"
            class="flex-1 min-h-0 overflow-y-auto overflow-x-auto"
            @scroll="onScroll"
          >
            <div v-if="loading" class="flex items-center justify-center py-12">
              <LoaderCircle class="animate-spin h-6 w-6 text-primary" />
              <span class="ml-3 text-sm text-muted-foreground">{{ t('common.loading') }}</span>
            </div>

            <table v-else class="w-max min-w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr class="border-b border-border bg-white sticky top-0 z-10">
                  <th class="w-10 px-2 py-2"></th>
                  <th
                    v-for="column in columns"
                    :key="column.key"
                    class="px-3 py-2 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap"
                    :style="column.width ? { width: column.width } : {}"
                  >
                    {{ column.label }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in displayItems"
                  :key="valueOf(item)"
                  :data-modal-selected="valueOf(item) === selectedValue"
                  :class="[
                    'cursor-pointer transition-colors border-b border-border/50 last:border-0',
                    valueOf(item) === selectedValue
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent text-card-foreground'
                  ]"
                  @click="selectRow(item)"
                  @dblclick="
                    () => {
                      selectRow(item)
                      confirmSelection()
                    }
                  "
                >
                  <td class="w-10 px-2 py-2 text-center">
                    <ArrowRight
                      v-if="valueOf(item) === selectedValue"
                      class="w-4 h-4 inline-block"
                    />
                  </td>
                  <td
                    v-for="column in columns"
                    :key="column.key"
                    class="px-3 py-2 whitespace-nowrap overflow-hidden text-ellipsis"
                    :class="[
                      column.key === valueKey ? 'font-medium' : '',
                      valueOf(item) === selectedValue
                        ? 'text-primary-foreground'
                        : column.key === valueKey
                          ? 'text-primary'
                          : ''
                    ]"
                  >
                    {{ item[column.key] ?? '' }}
                  </td>
                </tr>

                <tr v-if="loadingMore">
                  <td :colspan="columns.length + 1" class="px-3 py-3 text-center">
                    <LoaderCircle class="animate-spin h-4 w-4 text-primary inline-block" />
                    <span class="ml-2 text-xs text-muted-foreground">{{
                      t('common.loading')
                    }}</span>
                  </td>
                </tr>

                <tr v-if="!loading && displayItems.length === 0">
                  <td
                    :colspan="columns.length + 1"
                    class="px-3 py-8 text-center text-muted-foreground text-sm"
                  >
                    {{ t('common.lookup.noItemsFound') }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            class="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/30"
          >
            <span v-if="isServerMode && !loading" class="text-xs text-muted-foreground">
              {{
                t(
                  'common.lookup.displayedCount',
                  { shown: displayItems.length, total: totalItems },
                  displayItems.length
                )
              }}
            </span>
            <span v-else></span>
            <div class="flex items-center gap-3">
              <button
                type="button"
                class="px-5 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded hover:opacity-90 transition"
                @click="confirmSelection"
              >
                {{ t('common.confirm') }}
              </button>
              <button
                type="button"
                class="px-5 py-1.5 text-sm font-medium border border-border rounded text-card-foreground hover:bg-accent transition"
                @click="cancel"
              >
                {{ t('common.cancel') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
