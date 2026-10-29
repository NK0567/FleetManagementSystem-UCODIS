<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { useImportMapping } from '@/modules/fleet/fleet-settings/composables/useImportMapping'
import { VEHICLE_IMPORT_COLUMNS, VEHICLE_REQUIRED, toVehicleRow } from '../domain/vehicleImport'
import { vehicleService } from '../services/vehicleService'

/** Adds vehicles from a CSV file; the server refuses each duplicate and says why in the report. */
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; imported: [] }>()

const { t } = useI18n()
const mapping = useImportMapping('vehicles', () => props.open)

const EXAMPLE = [
  '5120 TBC',
  'LZZ5ELND9KN000123',
  'Tracteur',
  'Sinotruk',
  'Howo A7',
  'Tracteur',
  'DEP-TNJ',
  '2023',
  'gazole',
  '40000',
  '12500',
  ''
]
</script>

<template>
  <CsvImportDialog
    :open="open"
    :title="t('fleet.vehicles.import.title')"
    :hint="t('fleet.vehicles.import.hint')"
    :columns="VEHICLE_IMPORT_COLUMNS"
    :required="VEHICLE_REQUIRED"
    :example="EXAMPLE"
    template-name="vehicules-modele.csv"
    created-key="fleet.vehicles.import.created"
    :to-row="toVehicleRow"
    :submit="vehicleService.importRows"
    :mapping="mapping"
    @close="emit('close')"
    @imported="emit('imported')"
  />
</template>
