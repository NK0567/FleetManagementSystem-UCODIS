<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ImportReport } from '@/core/utils/csvImport'
import { REFERENCE_IMPORTS, toReferenceRow, type ReferenceImportKind } from './referenceImport'

/** Adds entities, categories or functions from a CSV file; the server applies the rules of the form. */
const props = defineProps<{
  open: boolean
  kind: ReferenceImportKind
  submit: (rows: Record<string, unknown>[]) => Promise<ImportReport>
}>()
const emit = defineEmits<{ close: []; imported: [] }>()

const { t } = useI18n()
const definition = computed(() => REFERENCE_IMPORTS[props.kind])
</script>

<template>
  <CsvImportDialog
    :open="open"
    :title="t(`hr.referenceImport.${kind}.title`)"
    :hint="t(`hr.referenceImport.${kind}.hint`)"
    :columns="definition.columns"
    :required="definition.required"
    :example="definition.example"
    :template-name="definition.templateName"
    :created-key="`hr.referenceImport.${kind}.created`"
    :to-row="toReferenceRow"
    :submit="submit"
    @close="emit('close')"
    @imported="emit('imported')"
  />
</template>
