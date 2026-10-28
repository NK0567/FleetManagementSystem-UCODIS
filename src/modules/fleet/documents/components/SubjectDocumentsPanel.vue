<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { apiErrorMessage } from '@/core/api/apiError'
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
    <p v-else-if="documents.length === 0" class="text-sm text-muted-foreground">
      {{ t('fleet.documents.noResults') }}
    </p>
    <table v-else class="w-full text-sm border border-border rounded">
      <thead>
        <tr class="bg-muted/40 text-left text-xs text-muted-foreground">
          <th class="px-3 py-2 font-semibold">{{ t('fleet.documents.col.documentTypeNo') }}</th>
          <th class="px-3 py-2 font-semibold">{{ t('fleet.documents.col.number') }}</th>
          <th class="px-3 py-2 font-semibold">{{ t('fleet.documents.col.expiryDate') }}</th>
          <th class="px-3 py-2 font-semibold">{{ t('fleet.documents.col.state') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="document in documents"
          :key="document.no"
          class="border-t border-border cursor-pointer hover:bg-accent/40"
          @click="open(document.no)"
        >
          <td class="px-3 py-1.5 text-primary">{{ document.documentTypeName }}</td>
          <td class="px-3 py-1.5">{{ document.number || '—' }}</td>
          <td class="px-3 py-1.5">{{ formatDate(document.expiryDate) }}</td>
          <td class="px-3 py-1.5"><DocumentStatePill :state="document.state" /></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
