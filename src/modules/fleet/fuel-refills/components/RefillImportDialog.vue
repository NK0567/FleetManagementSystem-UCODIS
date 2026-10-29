<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { REFILL_IMPORT_COLUMNS, REFILL_REQUIRED, toImportRow } from '../domain/refillImport'
import { fuelRefillService } from '../services/fuelRefillService'
import { useImportMapping } from '@/modules/fleet/fleet-settings/composables/useImportMapping'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; imported: [] }>()

const { t } = useI18n()
const mapping = useImportMapping('refills', () => props.open)

const EXAMPLE = [
  '4021 TBA',
  '03/09/2026 15:00',
  '300',
  '5500',
  '182500',
  'Station Jovena',
  'oui',
  ''
]
</script>

<template>
  <CsvImportDialog
    :open="open"
    :title="t('fleet.fuelRefills.import.title')"
    :hint="t('fleet.fuelRefills.import.hint')"
    :columns="REFILL_IMPORT_COLUMNS"
    :required="REFILL_REQUIRED"
    :example="EXAMPLE"
    template-name="pleins-modele.csv"
    created-key="fleet.fuelRefills.import.created"
    :to-row="toImportRow"
    :submit="fuelRefillService.importRows"
    :mapping="mapping"
    @close="emit('close')"
    @imported="emit('imported')"
  />
</template>
