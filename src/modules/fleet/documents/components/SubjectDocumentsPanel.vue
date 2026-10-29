<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import type { SubListColumn } from '@/components/shared/RecordSubList.vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { apiErrorMessage } from '@/core/api/apiError'
import { useOptionsStore } from '@/stores/optionsStore'
import { formatDate } from '@/utils/format'
import { documentService } from '../services/documentService'
import type { DocumentApi, SubjectKind } from '../types/document.types'

const props = defineProps<{
  target: SubjectKind
  subjectNo: string
  /** Mandatory documents missing or past their validity, as the subject reports them. */
  gaps?: string
}>()

const { t } = useI18n()
const router = useRouter()
const optionsStore = useOptionsStore()
const documents = ref<DocumentApi[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    const page = await documentService.getAll({
      pageSize: 100,
      sortBy: 'documentTypeName',
      filters: [
        { field: 'target', valueType: 'string', value: props.target },
        { field: 'subjectNo', valueType: 'string', value: props.subjectNo },
        { field: 'current', valueType: 'boolean', value: true }
      ]
    })
    documents.value = page.data.items
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('fleet.documents.loadError'))
  } finally {
    loading.value = false
  }
}

function open(no: string) {
  void router.push({ path: '/fleet/documents', query: { no, cardMode: 'view' } })
}

const columns = computed<SubListColumn[]>(() => [
  { sortKey: 'documentTypeName', label: t('fleet.documents.col.documentTypeNo'), filter: true },
  { sortKey: 'number', label: t('fleet.documents.col.number') },
  {
    sortKey: 'expiryDate',
    label: t('fleet.documents.col.expiryDate'),
    formatter: (v) => formatDate(v as string | null)
  },
  {
    sortKey: 'state',
    label: t('fleet.documents.col.state'),
    formatter: (v) => optionsStore.getOptionLabel('documentState', v),
    filter: true
  }
])

onMounted(load)
watch(() => props.subjectNo, load)
</script>

<template>
  <div class="space-y-2">
    <p v-if="gaps" class="text-sm text-destructive">
      {{ t('fleet.documents.gaps', { gaps }) }}
    </p>
    <FormAlerts :error="error" @clear:error="error = null" />
    <LoadingSpinner v-if="loading" :text="t('common.loading')" />
    <RecordSubList
      v-else
      :rows="documents as unknown as Record<string, unknown>[]"
      :columns="columns"
      row-key="no"
      :empty-text="t('fleet.documents.noResults')"
      clickable
      @row-click="(row: Record<string, unknown>) => open(String(row.no))"
    >
      <template #cell-documentTypeName="{ text }">
        <span class="text-primary">{{ text }}</span>
      </template>
      <template #cell-state="{ row }">
        <DocumentStatePill :state="row.state as DocumentApi['state']" />
      </template>
    </RecordSubList>
  </div>
</template>
