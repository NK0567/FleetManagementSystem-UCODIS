<script lang="ts" setup>
import { ref, computed, watch, useSlots, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Search,
  Funnel,
  Info,
  ChevronDown,
  LayoutList,
  LayoutGrid,
  Download,
  Eye,
  Pencil
} from '@lucide/vue'
import SearchBar from './SearchBar.vue'

const { t } = useI18n()
const slots = useSlots()
const hasColumnPicker = computed(() => !!slots['column-picker'])
const columnPickerOpen = ref(false)
const columnPickerTriggerRef = ref<HTMLElement | null>(null)

const listViewDropdownOpen = ref(false)
const listViewDropdownRef = ref<HTMLElement | null>(null)

function toggleColumnPicker() {
  columnPickerOpen.value = !columnPickerOpen.value
}

function toggleListViewDropdown() {
  listViewDropdownOpen.value = !listViewDropdownOpen.value
}

function onListViewSelect(value: string) {
  emit('update:listView', value)
  listViewDropdownOpen.value = false
}

function onColumnPickerClickOutside(e: MouseEvent) {
  const el = columnPickerTriggerRef.value
  if (columnPickerOpen.value && el && !el.contains(e.target as Node)) {
    columnPickerOpen.value = false
  }
}

function onListViewDropdownClickOutside(e: MouseEvent) {
  const el = listViewDropdownRef.value
  if (listViewDropdownOpen.value && el && !el.contains(e.target as Node)) {
    listViewDropdownOpen.value = false
  }
}

function onMousedown(e: MouseEvent) {
  onColumnPickerClickOutside(e)
  onListViewDropdownClickOutside(e)
}
onMounted(() => document.addEventListener('mousedown', onMousedown))
onUnmounted(() => document.removeEventListener('mousedown', onMousedown))

const props = withDefaults(
  defineProps<{
    title: string
    showFilterPanel: boolean
    showDetailsPanel: boolean
    showCreate?: boolean
    searchColumn?: string
    columnOptions?: { value: string; label: string }[]
    searchLoading?: boolean
    searchQuery?: string
    showViewToggle?: boolean
    view?: 'list' | 'kanban'
    listViewOptions?: { value: string; label: string }[]
    listView?: string
    showListView?: boolean
    showFilterToggle?: boolean
    appliedFilterCount?: number
    showDetailsToggle?: boolean
    searchExpandedByDefault?: boolean
    showExportExcel?: boolean
    exporting?: boolean
    exportExcel?: () => void | Promise<void>
    showCardActions?: boolean
    canViewSelected?: boolean
    canEditSelected?: boolean
  }>(),
  {
    showCreate: true,
    searchColumn: undefined,
    columnOptions: () => [],
    searchLoading: false,
    searchQuery: '',
    showViewToggle: false,
    view: 'list',
    listViewOptions: () => [],
    listView: 'all',
    showListView: true,
    showFilterToggle: true,
    appliedFilterCount: 0,
    showDetailsToggle: true,
    searchExpandedByDefault: false,
    showExportExcel: true,
    exporting: false,
    showCardActions: false,
    canViewSelected: false,
    canEditSelected: false
  }
)

const emit = defineEmits<{
  toggleFilter: []
  toggleDetails: []
  create: []
  search: [query: string]
  clear: []
  'update:searchColumn': [column: string]
  'update:view': [view: 'list' | 'kanban']
  'update:listView': [value: string]
  view: []
  edit: []
}>()

function onExportClick() {
  void props.exportExcel?.()
}

const hasSearch = computed(() => (props.columnOptions?.length ?? 0) > 0)
const hasAppliedSearch = computed(() => Boolean(props.searchQuery?.trim()))
const searchExpanded = ref(props.searchExpandedByDefault || hasAppliedSearch.value)

watch(hasAppliedSearch, (applied) => {
  if (applied) searchExpanded.value = true
})

const toggleSearch = () => {
  searchExpanded.value = !searchExpanded.value
}

const toggleView = () => {
  emit('update:view', props.view === 'list' ? 'kanban' : 'list')
}
</script>

<template>
  <div class="bg-card border-b border-border px-2 py-1 shrink-0">
    <div class="flex flex-nowrap items-center min-w-0 gap-0">
      <div v-if="showListView" class="flex shrink-0 items-center gap-1" ref="listViewDropdownRef">
        <h1 class="text-sm font-medium text-card-foreground">{{ title }}:</h1>
        <template v-if="listViewOptions && listViewOptions.length > 0">
          <div class="relative">
            <button
              type="button"
              class="px-3 text-sm font-medium text-card-foreground transition hover:bg-primary/5 rounded flex items-center gap-0.5"
              :aria-expanded="listViewDropdownOpen"
              aria-haspopup="listbox"
              @click="toggleListViewDropdown"
            >
              <span class="text-sm font-medium text-primary">
                {{ listViewOptions.find((o) => o.value === listView)?.label ?? t('common.all') }}
              </span>
              <ChevronDown class="w-4 h-4 text-primary" />
            </button>
            <div
              v-show="listViewDropdownOpen"
              class="absolute left-0 top-full z-50 mt-0.5 min-w-[180px] rounded border border-border bg-card py-1 shadow-lg"
              role="listbox"
            >
              <button
                v-for="opt in listViewOptions"
                :key="opt.value"
                type="button"
                role="option"
                :aria-selected="listView === opt.value"
                class="w-full px-3 py-2 text-left text-sm transition hover:bg-accent"
                :class="
                  listView === opt.value
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-card-foreground'
                "
                @click="onListViewSelect(opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
        </template>
      </div>

      <template v-if="hasSearch">
        <div class="border-l border-border h-6 mx-2 shrink-0" aria-hidden="true" />
        <div class="flex shrink-0 items-center">
          <button
            type="button"
            class="w-7.5 h-7.5 flex items-center justify-center text-muted-foreground hover:bg-accent rounded transition shrink-0"
            :class="{ 'bg-primary/50 text-primary-foreground': searchExpanded || hasAppliedSearch }"
            :title="t('common.search')"
            :aria-label="t('common.search')"
            @click="toggleSearch"
          >
            <Search class="w-4 h-4" />
          </button>
          <div
            class="overflow-hidden transition-[max-width] duration-200 ease-out flex items-center py-1"
            :class="searchExpanded ? 'max-w-full min-w-0' : 'max-w-0 min-w-0'"
          >
            <div class="w-full pl-2 pr-2">
              <SearchBar
                :search-column="searchColumn ?? ''"
                :column-options="columnOptions"
                :loading="searchLoading"
                :query="searchQuery"
                @search="emit('search', $event)"
                @clear="emit('clear')"
                @update:search-column="emit('update:searchColumn', $event)"
              />
            </div>
          </div>
        </div>
      </template>

      <template v-if="showCardActions">
        <div class="border-l border-border h-6 mx-2 shrink-0" aria-hidden="true" />
        <div class="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-card-foreground bg-card border border-border rounded hover:bg-accent transition shrink-0 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            :disabled="!canViewSelected"
            :title="t('common.view')"
            :aria-label="t('common.view')"
            @click="emit('view')"
          >
            <Eye class="w-4 h-4 shrink-0 text-primary" aria-hidden="true" />
            {{ t('common.view') }}
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-card-foreground bg-card border border-border rounded hover:bg-accent transition shrink-0 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            :disabled="!canEditSelected"
            :title="t('common.edit')"
            :aria-label="t('common.edit')"
            @click="emit('edit')"
          >
            <Pencil class="w-4 h-4 shrink-0 text-primary" aria-hidden="true" />
            {{ t('common.edit') }}
          </button>
        </div>
      </template>

      <div class="flex-1 min-w-0" />

      <div class="flex shrink-0 items-center gap-2 ml-2">
        <button
          v-if="showFilterToggle"
          @click="emit('toggleFilter')"
          :class="[
            'relative p-2 rounded transition',
            showFilterPanel || appliedFilterCount > 0
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent'
          ]"
          :title="showFilterPanel ? t('common.hideFilter') : t('common.showFilter')"
        >
          <Funnel class="w-4 h-4" />
          <span
            v-if="appliedFilterCount > 0"
            class="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground"
          >
            {{ appliedFilterCount > 99 ? '99+' : appliedFilterCount }}
          </span>
        </button>

        <button
          v-if="showDetailsToggle"
          @click="emit('toggleDetails')"
          :class="[
            'p-2 rounded transition',
            showDetailsPanel
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent'
          ]"
          :title="showDetailsPanel ? t('common.hideDetails') : t('common.showDetails')"
        >
          <Info class="w-4 h-4" />
        </button>

        <div
          v-if="hasColumnPicker && view === 'list'"
          ref="columnPickerTriggerRef"
          class="relative shrink-0"
        >
          <button
            type="button"
            :class="[
              'p-2 rounded transition',
              columnPickerOpen
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent'
            ]"
            :title="t('common.columns')"
            :aria-label="t('common.columns')"
            :aria-expanded="columnPickerOpen"
            @click="toggleColumnPicker"
          >
            <LayoutList class="w-4 h-4" />
          </button>
          <div v-show="columnPickerOpen" class="absolute right-0 top-full z-50 mt-0.5" @click.stop>
            <slot name="column-picker" />
          </div>
        </div>

        <button
          v-if="showExportExcel && exportExcel && view === 'list'"
          type="button"
          class="p-2 rounded transition text-muted-foreground hover:bg-accent disabled:opacity-50 disabled:pointer-events-none"
          :title="t('common.exportExcel')"
          :aria-label="t('common.exportExcel')"
          :disabled="exporting"
          @click="onExportClick"
        >
          <Download class="w-4 h-4" :class="{ 'animate-pulse': exporting }" />
        </button>

        <button
          v-if="showViewToggle"
          type="button"
          :class="[
            'p-2 rounded transition',
            view === 'kanban'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent'
          ]"
          :title="view === 'kanban' ? t('common.listView') : t('common.kanbanView')"
          :aria-label="view === 'kanban' ? t('common.listView') : t('common.kanbanView')"
          @click="toggleView"
        >
          <LayoutGrid class="w-4 h-4" />
        </button>

        <div v-if="showCreate" class="border-l border-border h-6 mx-1"></div>

        <button
          v-if="showCreate"
          type="button"
          class="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 transition font-medium text-sm"
          @click="emit('create')"
        >
          {{ t('common.new') }}
        </button>
      </div>
    </div>
  </div>
</template>
