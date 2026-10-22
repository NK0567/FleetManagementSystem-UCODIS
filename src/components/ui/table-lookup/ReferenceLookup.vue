<script lang="ts" setup>
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useReferenceStore } from '@/stores/referenceStore'
import TableLookup from './TableLookup.vue'
import type { LookupItem } from './TableLookupModal.vue'

const props = withDefaults(
  defineProps<{
    modelValue: string | null
    /** Key of the list in GET /reference/all. */
    referenceKey: string
    disabled?: boolean
    invalid?: boolean
    showLockIcon?: boolean
    placeholder?: string
  }>(),
  {
    disabled: false,
    invalid: false,
    showLockIcon: false,
    placeholder: ''
  }
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const { t } = useI18n()
const referenceStore = useReferenceStore()

const columns = computed(() => [
  { key: 'code', label: t('common.code'), width: '120px' },
  { key: 'description', label: t('common.description') }
])

/** Inactive entries stay readable on existing records but cannot be picked again. */
const items = computed<LookupItem[]>(() =>
  referenceStore
    .getItems(props.referenceKey)
    .filter((item) => item.active !== false || item.code === props.modelValue)
)

const displayFormat = (item: LookupItem) => `${String(item.code)} · ${String(item.description)}`

// Forms are where references get picked: reload them so records created meanwhile show up.
onMounted(() => void referenceStore.refresh())
</script>

<template>
  <TableLookup
    :model-value="modelValue ?? ''"
    :items="items"
    :columns="columns"
    :display-format="displayFormat"
    :placeholder="placeholder"
    :disabled="disabled"
    :invalid="invalid"
    :show-lock-icon="showLockIcon"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>
