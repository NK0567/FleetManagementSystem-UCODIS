<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Download } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { saveBlob } from '@/utils/downloadBlobResponse'
import {
  mapHeaders,
  missingColumns,
  REFILL_IMPORT_COLUMNS,
  toImportRow,
  type RefillImportField
} from '../domain/refillImport'
import { fuelRefillService } from '../services/fuelRefillService'
import type { RefillImportReport } from '../types/fuelRefill.types'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; imported: [] }>()

const { t } = useI18n()

const fileName = ref('')
const rows = ref<Record<string, unknown>[]>([])
const missing = ref<RefillImportField[]>([])
const report = ref<RefillImportReport | null>(null)
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
  const mapping = mapHeaders(parsed.meta.fields ?? [])
  missing.value = missingColumns(mapping)
  rows.value = parsed.data.map((record) => toImportRow(record, mapping))
}

const missingColumnNames = computed(() =>
  missing.value.map((field) => REFILL_IMPORT_COLUMNS[field][0]).join(', ')
)

const canImport = computed(() => rows.value.length > 0 && missing.value.length === 0)

async function runImport() {
  working.value = true
  error.value = null
  try {
    report.value = await fuelRefillService.importRows(rows.value)
    if (report.value.created) emit('imported')
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('fleet.fuelRefills.import.error'))
  } finally {
    working.value = false
  }
}

function downloadTemplate() {
  const headers = Object.values(REFILL_IMPORT_COLUMNS).map((names) => names[0])
  const example = [
    '4021 TBA',
    '03/09/2026 15:00',
    '300',
    '5500',
    '182500',
    'Station Jovena',
    'oui',
    ''
  ]
  const csv = `${headers.join(';')}\n${example.join(';')}\n`
  saveBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'pleins-modele.csv')
}

const rejected = computed(() => report.value?.results.filter((result) => result.error) ?? [])
</script>

<template>
  <ConfirmDialog
    :open="open"
    :title="t('fleet.fuelRefills.import.title')"
    :confirm-label="report ? t('common.close') : t('fleet.fuelRefills.import.run', rows.length)"
    :confirm-disabled="!report && !canImport"
    :loading="working"
    panel-class="max-w-xl"
    @confirm="report ? emit('close') : runImport()"
    @cancel="emit('close')"
  >
    <div class="space-y-3 text-sm">
      <p class="text-muted-foreground">{{ t('fleet.fuelRefills.import.hint') }}</p>
      <button
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 text-primary hover:underline"
        @click="downloadTemplate"
      >
        <Download class="w-4 h-4" /> {{ t('fleet.fuelRefills.import.template') }}
      </button>

      <input
        v-if="!report"
        type="file"
        accept=".csv,text/csv"
        class="block w-full text-sm"
        @change="readFile"
      />

      <p v-if="fileName && !report" class="text-card-foreground">
        {{ t('fleet.fuelRefills.import.read', { file: fileName, count: rows.length }) }}
      </p>
      <p v-if="missing.length" class="text-destructive">
        {{ t('fleet.fuelRefills.import.missing', { columns: missingColumnNames }) }}
      </p>

      <FormAlerts :error="error" @clear:error="error = null" />

      <template v-if="report">
        <p class="text-card-foreground">
          {{ t('fleet.fuelRefills.import.created', report.created) }}
          {{ t('fleet.fuelRefills.import.rejected', report.rejected) }}
        </p>
        <ul
          v-if="rejected.length"
          class="max-h-56 overflow-y-auto divide-y divide-border border border-border rounded"
        >
          <li v-for="result in rejected" :key="result.line" class="px-3 py-1.5">
            <span class="font-medium text-card-foreground">
              {{ t('fleet.fuelRefills.import.line', { line: result.line }) }}
            </span>
            · <span class="text-muted-foreground">{{ result.error }}</span>
          </li>
        </ul>
      </template>
    </div>
  </ConfirmDialog>
</template>
