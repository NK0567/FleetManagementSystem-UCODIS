<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { useImportMapping } from '@/modules/fleet/fleet-settings/composables/useImportMapping'
import { EMPLOYEE_IMPORT_COLUMNS, EMPLOYEE_REQUIRED, toEmployeeRow } from '../domain/employeeImport'
import { employeeService } from '../services/employeeService'

/** Adds people from a CSV file; the server applies the rules of the form to each line. */
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; imported: [] }>()

const { t } = useI18n()
const mapping = useImportMapping('people', () => props.open)

const EXAMPLE = [
  'Rasolofo',
  'Nirina',
  'Conducteur',
  'CND',
  'CAT-C',
  'DEP-TNJ',
  '034 12 350 01',
  '',
  '101 234 600 001',
  'CDI',
  '02/11/2026'
]
</script>

<template>
  <CsvImportDialog
    :open="open"
    :title="t('hr.employees.import.title')"
    :hint="t('hr.employees.import.hint')"
    :columns="EMPLOYEE_IMPORT_COLUMNS"
    :required="EMPLOYEE_REQUIRED"
    :example="EXAMPLE"
    template-name="personnes-modele.csv"
    created-key="hr.employees.import.created"
    :to-row="toEmployeeRow"
    :submit="employeeService.importRows"
    :mapping="mapping"
    @close="emit('close')"
    @imported="emit('imported')"
  />
</template>
