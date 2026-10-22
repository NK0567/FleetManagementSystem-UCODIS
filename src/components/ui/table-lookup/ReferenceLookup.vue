<script lang="ts" setup>
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useReferenceStore } from '@/stores/referenceStore'
import { fetchPaginatedLocal } from '@/utils/tableLookupLocalFetch'
import TableLookupField from './TableLookupField.vue'
import type { FetchFnParams, FetchFnResult } from './TableLookupModal.vue'

const props = withDefaults(
  defineProps<{
    modelValue: string | null
    /** Key of the list in GET /reference/all. */
    referenceKey: string
    /** Title of the full-list modal, usually the field label. */
    modalTitle?: string
    /** List page of the referenced records: the details button opens the record there. */
    detailPath?: string
    disabled?: boolean
    invalid?: boolean
    placeholder?: string
    /** Codes that cannot be picked, such as a unit and its sub-units for its own parent. */
    excludeCodes?: string[]
  }>(),
  {
    modalTitle: undefined,
    detailPath: undefined,
    disabled: false,
    invalid: false,
    placeholder: '',
    excludeCodes: () => []
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
const selectableItems = computed(() =>
  referenceStore
    .getItems(props.referenceKey)
    .filter((item) => item.active !== false || item.code === props.modelValue)
    .filter((item) => !props.excludeCodes.includes(item.code))
)

const selectedName = computed(() =>
  props.modelValue
    ? (referenceStore.getItems(props.referenceKey).find((item) => item.code === props.modelValue)
        ?.description ?? '')
    : ''
)

const fetchItems = async (params: FetchFnParams): Promise<FetchFnResult> =>
  fetchPaginatedLocal(selectableItems.value, params, ['code', 'description'])

const detailRouteBuilder = computed(() => {
  const path = props.detailPath
  return path ? (code: string) => ({ path, query: { no: code } }) : undefined
})

// Forms are where references get picked: reload them so records created meanwhile show up.
onMounted(() => void referenceStore.refresh())
</script>

<template>
  <TableLookupField
    :code="modelValue ?? ''"
    :name="selectedName"
    :columns="columns"
    value-key="code"
    name-key="description"
    :fetch-fn="fetchItems"
    :fetch-on-mount="false"
    :modal-title="modalTitle ?? t('common.lookup.selectTitle')"
    :modal-preferences-table-id="`reference-lookup-${referenceKey}`"
    :placeholder="placeholder"
    :disabled="disabled"
    :invalid="invalid"
    :detail-route-builder="detailRouteBuilder"
    details-in-new-tab
    @update:code="emit('update:modelValue', $event)"
  />
</template>
