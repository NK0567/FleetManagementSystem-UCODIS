<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ImportReport } from '@/core/utils/csvImport'
import {
  TRANSACTION_IMPORT_COLUMNS,
  TRANSACTION_REQUIRED,
  toTransactionRow
} from '../domain/transactionImport'
import { fuelCardTransactionService } from '../services/fuelCardTransactionService'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; imported: [matched: number] }>()

const { t } = useI18n()

const EXAMPLE = [
  '7089 1200 0001 4021',
  '03/09/2026 15:04',
  'Station Jovena',
  'Antsirabe',
  '300',
  '1650000'
]

/** The statement is imported, then every transaction alone is matched with the refills. */
const matched = ref(0)
async function submit(rows: Record<string, unknown>[]): Promise<ImportReport> {
  const report = await fuelCardTransactionService.importRows(rows)
  matched.value = report.matched
  return report
}
</script>

<template>
  <CsvImportDialog
    :open="open"
    :title="t('fleet.fuelCardTransactions.import.title')"
    :hint="t('fleet.fuelCardTransactions.import.hint')"
    :columns="TRANSACTION_IMPORT_COLUMNS"
    :required="TRANSACTION_REQUIRED"
    :example="EXAMPLE"
    template-name="transactions-cartes-modele.csv"
    created-key="fleet.fuelCardTransactions.import.created"
    :to-row="toTransactionRow"
    :submit="submit"
    @close="emit('close')"
    @imported="emit('imported', matched)"
  />
</template>
