<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { PROVIDER_IMPORT_COLUMNS, PROVIDER_REQUIRED, toProviderRow } from '../domain/providerImport'
import { providerService } from '../services/providerService'

/** Adds providers from a CSV file; the server refuses each duplicate and says why in the report. */
defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; imported: [] }>()

const { t } = useI18n()

const EXAMPLE = [
  'Garage Andraharo',
  'garage',
  'Hery Rakoto',
  '+261 34 00 000 00',
  'atelier@andraharo.mg',
  'Lot II A 12, Andraharo'
]
</script>

<template>
  <CsvImportDialog
    :open="open"
    :title="t('fleet.providers.import.title')"
    :hint="t('fleet.providers.import.hint')"
    :columns="PROVIDER_IMPORT_COLUMNS"
    :required="PROVIDER_REQUIRED"
    :example="EXAMPLE"
    template-name="prestataires-modele.csv"
    created-key="fleet.providers.import.created"
    :to-row="toProviderRow"
    :submit="providerService.importRows"
    @close="emit('close')"
    @imported="emit('imported')"
  />
</template>
