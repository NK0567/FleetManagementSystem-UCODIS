<script lang="ts" setup generic="F extends string">
import { computed, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Download } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import {
  mapHeaders,
  missingColumns,
  normalizeHeader,
  type ImportColumns,
  type ImportReport
} from '@/core/utils/csvImport'
import { saveBlob } from '@/utils/downloadBlobResponse'

/**
 * Reads a CSV file in the browser, maps its headers, then sends the rows to the server, which applies
 * the same rules as a manual entry and reports each refused line.
 */
const props = defineProps<{
  open: boolean
  title: string
  hint: string
  columns: ImportColumns<F>
  required: readonly F[]
  /** One example line for the template, in column order. */
  example: readonly string[]
  templateName: string
  /** Message for the number of records created, with its plural forms. */
  createdKey: string
  toRow: (record: Record<string, string>, mapping: Map<string, F>) => Record<string, unknown>
  submit: (rows: Record<string, unknown>[]) => Promise<ImportReport>
  /** Headings of the source file the administrator set for some fields; they are read first. */
  mapping?: Partial<Record<string, string>> | null
}>()
const emit = defineEmits<{ close: []; imported: [] }>()

const { t } = useI18n()

/** The heading set for a field comes first, so that it also heads the template. */
const columns = computed<ImportColumns<F>>(() => {
  const result = {} as Record<F, readonly string[]>
  for (const field of Object.keys(props.columns) as F[]) {
    const heading = props.mapping?.[field]?.trim()
    result[field] = heading
      ? [heading, normalizeHeader(heading), ...props.columns[field]]
      : props.columns[field]
  }
  return result
})
const mappedFields = computed(() =>
  (Object.keys(props.columns) as F[]).filter((field) => !!props.mapping?.[field]?.trim())
)

const fileName = ref('')
const rows = ref<Record<string, unknown>[]>([])
const missing = shallowRef<F[]>([])
const report = ref<ImportReport | null>(null)
const error = ref<string | null>(null)
const working = ref(false)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    fileName.value = ''
    rows.value = []
    missing.value = []
    report.value = null
    error.value = null
  }
)

async function readFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  report.value = null
  error.value = null
  if (!file) return
  fileName.value = file.name
  const { default: Papa } = await import('papaparse')
  const parsed = Papa.parse<Record<string, string>>(await file.text(), {
    header: true,
    skipEmptyLines: 'greedy'
  })
  const mapping = mapHeaders(columns.value, parsed.meta.fields ?? [])
  missing.value = missingColumns(mapping, props.required)
  rows.value = parsed.data.map((record) => props.toRow(record, mapping))
}

const missingColumnNames = computed(() =>
  missing.value.map((field) => columns.value[field][0]).join(', ')
)

const canImport = computed(() => rows.value.length > 0 && missing.value.length === 0)

async function runImport() {
  working.value = true
  error.value = null
  try {
    report.value = await props.submit(rows.value)
    if (report.value.created) emit('imported')
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('common.import.error'))
  } finally {
    working.value = false
  }
}

function downloadTemplate() {
  const headers = (Object.keys(columns.value) as F[]).map((field) => columns.value[field][0])
  const csv = `${headers.join(';')}\n${props.example.join(';')}\n`
  saveBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), props.templateName)
}

const rejected = computed(() => report.value?.results.filter((result) => result.error) ?? [])
</script>

<template>
  <ConfirmDialog
    :open="open"
    :title="title"
    :confirm-label="report ? t('common.close') : t('common.import.run', rows.length)"
    :confirm-disabled="!report && !canImport"
    :loading="working"
    panel-class="max-w-xl"
    @confirm="report ? emit('close') : runImport()"
    @cancel="emit('close')"
  >
    <div class="space-y-3 text-sm">
      <p class="text-muted-foreground">{{ hint }}</p>
      <p v-if="mappedFields.length" class="text-xs text-muted-foreground">
        {{ t('common.import.mapped', mappedFields.length) }}
      </p>
      <button
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 text-primary hover:underline"
        @click="downloadTemplate"
      >
        <Download class="w-4 h-4" /> {{ t('common.import.template') }}
      </button>

      <input
        v-if="!report"
        type="file"
        accept=".csv,text/csv"
        class="block w-full text-sm"
        @change="readFile"
      />

      <p v-if="fileName && !report" class="text-card-foreground">
        {{ t('common.import.read', { file: fileName, count: rows.length }) }}
      </p>
      <p v-if="missing.length" class="text-destructive">
        {{ t('common.import.missing', { columns: missingColumnNames }) }}
      </p>

      <FormAlerts :error="error" @clear:error="error = null" />

      <template v-if="report">
        <p class="text-card-foreground">
          {{ t(createdKey, report.created) }}
          {{ t('common.import.rejected', report.rejected) }}
        </p>
        <ul
          v-if="rejected.length"
          class="max-h-56 overflow-y-auto divide-y divide-border border border-border rounded"
        >
          <li v-for="result in rejected" :key="result.line" class="px-3 py-1.5">
            <span class="font-medium text-card-foreground">
              {{ t('common.import.line', { line: result.line }) }}
            </span>
            · <span class="text-muted-foreground">{{ result.error }}</span>
          </li>
        </ul>
      </template>
    </div>
  </ConfirmDialog>
</template>
