<script lang="ts" setup>
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { X, LoaderCircle, Search } from '@lucide/vue'
import DateFormInput from '@/components/ui/input/DateFormInput.vue'

const { t } = useI18n()

export interface SearchColumnOption {
  value: string
  label: string
  inputType?: 'text' | 'date'
}

const props = defineProps<{
  searchColumn: string
  columnOptions: SearchColumnOption[]
  loading?: boolean
  query?: string
}>()

const emit = defineEmits<{
  search: [query: string]
  clear: []
  'update:searchColumn': [column: string]
}>()

const searchInput = ref(props.query ?? '')

const isDateColumn = computed(
  () => props.columnOptions.find((o) => o.value === props.searchColumn)?.inputType === 'date'
)

watch(
  () => props.query,
  (q) => {
    if (q === undefined) return
    searchInput.value = q
  }
)

watch(
  () => props.searchColumn,
  () => {
    const hadQuery = searchInput.value.trim() !== ''
    searchInput.value = ''
    if (hadQuery) emit('clear')
  }
)

function submitSearch() {
  emit('search', searchInput.value)
}

const clearSearch = () => {
  searchInput.value = ''
  emit('clear')
}

const onColumnChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  emit('update:searchColumn', target.value)
}

const currentLabel = () =>
  props.columnOptions.find((o) => o.value === props.searchColumn)?.label.toLowerCase() ?? ''
</script>

<template>
  <form class="flex items-center gap-2" @submit.prevent="submitSearch">
    <select
      :value="searchColumn"
      @change="onColumnChange"
      class="px-3 py-1 border border-border rounded-lg focus:outline-none focus:ring focus:ring-ring focus:border-primary text-sm bg-card min-w-[140px]"
    >
      <option v-for="option in columnOptions" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>

    <div class="relative flex-1 min-w-[100px]">
      <DateFormInput
        v-if="isDateColumn"
        :model-value="searchInput"
        class="w-full px-4 py-1 pr-10 border border-border rounded-lg focus:outline-none focus:ring focus:ring-ring focus:border-primary text-sm"
        @update:model-value="(v) => (searchInput = v)"
      />
      <input
        v-else
        type="text"
        v-model="searchInput"
        :placeholder="t('common.searchBy', { column: currentLabel() })"
        class="w-full px-4 py-1 pr-10 border border-border rounded-lg focus:outline-none focus:ring focus:ring-ring focus:border-primary text-sm"
      />
      <button
        v-if="searchInput && !loading"
        type="button"
        @click="clearSearch"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-card-foreground"
        :title="t('common.clearSearch')"
      >
        <X class="w-4 h-4" />
      </button>
      <div v-if="loading" class="absolute right-3 top-1/2 -translate-y-1/2">
        <LoaderCircle class="animate-spin h-4 w-4 text-primary" />
      </div>
    </div>

    <button
      type="submit"
      class="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="loading"
      :title="t('common.search')"
      :aria-label="t('common.search')"
    >
      <Search class="w-4 h-4" />
    </button>
  </form>
</template>
