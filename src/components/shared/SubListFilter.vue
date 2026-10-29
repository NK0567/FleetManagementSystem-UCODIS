<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { Search, X } from '@lucide/vue'

/**
 * Search box, and an optional choice, above a list inside a record: the lists of a record can
 * grow long, so each one can be narrowed without leaving the record.
 */
const props = defineProps<{
  choices?: { value: string; label: string }[]
  choiceLabel?: string
  shown: number
  total: number
}>()
const query = defineModel<string>('query', { default: '' })
const choice = defineModel<string>('choice', { default: '' })

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-wrap items-center gap-2 mb-2">
    <label class="relative flex-1 min-w-40 max-w-72">
      <Search
        class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
      />
      <input
        v-model="query"
        type="search"
        class="w-full h-8 pl-8 pr-2 text-sm border border-border rounded bg-background outline-none focus:border-primary"
        :placeholder="t('common.subList.search')"
        :aria-label="t('common.subList.search')"
      />
    </label>
    <select
      v-if="props.choices?.length"
      v-model="choice"
      class="h-8 px-2 text-sm border border-border rounded bg-background"
      :aria-label="props.choiceLabel"
    >
      <option value="">{{ props.choiceLabel }} · {{ t('common.subList.all') }}</option>
      <option v-for="item in props.choices" :key="item.value" :value="item.value">
        {{ item.label }}
      </option>
    </select>
    <button
      v-if="query || choice"
      type="button"
      class="cursor-pointer inline-flex items-center gap-1 px-2 h-8 text-xs text-muted-foreground hover:text-card-foreground"
      @click="((query = ''), (choice = ''))"
    >
      <X class="w-3.5 h-3.5" /> {{ t('common.subList.clear') }}
    </button>
    <span class="ml-auto text-xs text-muted-foreground tabular-nums">
      {{ t('common.subList.count', { shown: props.shown, total: props.total }) }}
    </span>
  </div>
</template>
