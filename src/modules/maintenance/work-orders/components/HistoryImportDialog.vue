<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { HISTORY_IMPORT_COLUMNS, HISTORY_REQUIRED, toHistoryRow } from '../domain/historyImport'
import { workOrderService } from '../services/workOrderService'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; imported: [] }>()

const { t } = useI18n()

const EXAMPLE = ['4021 TBA', '12/03/2025', 'préventif', 'Vidange et filtres', '120500', '450000']
</script>

<template>
  <CsvImportDialog
    :open="open"
    :title="t('maintenance.workOrders.import.title')"
    :hint="t('maintenance.workOrders.import.hint')"
    :columns="HISTORY_IMPORT_COLUMNS"
    :required="HISTORY_REQUIRED"
    :example="EXAMPLE"
    template-name="historique-maintenance-modele.csv"
    created-key="maintenance.workOrders.import.created"
    :to-row="toHistoryRow"
    :submit="workOrderService.importHistory"
    @close="emit('close')"
    @imported="emit('imported')"
  />
</template>
