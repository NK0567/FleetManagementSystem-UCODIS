<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { REQUEST_IMPORT_COLUMNS, REQUEST_REQUIRED, toRequestRow } from '../domain/requestImport'
import { deliveryRequestService } from '../services/deliveryRequestService'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; imported: [] }>()

const { t } = useI18n()

const EXAMPLE = ['CLI-002', 'DP-002', 'PRD-001', '240', '15/09/2026', '', 'LPA-6020', '3600', '']
</script>

<template>
  <CsvImportDialog
    :open="open"
    :title="t('planning.deliveryRequests.import.title')"
    :hint="t('planning.deliveryRequests.import.hint')"
    :columns="REQUEST_IMPORT_COLUMNS"
    :required="REQUEST_REQUIRED"
    :example="EXAMPLE"
    template-name="demandes-livraison-modele.csv"
    created-key="planning.deliveryRequests.import.created"
    :to-row="toRequestRow"
    :submit="deliveryRequestService.importRows"
    @close="emit('close')"
    @imported="emit('imported')"
  />
</template>
