<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import InspectionForm from '../components/InspectionForm.vue'
import { inspectionService } from '../services/inspectionService'
import type { InspectionApi } from '../types/inspection.types'

const emit = defineEmits<{ close: []; created: [inspection: InspectionApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof InspectionForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: inspectionService.create,
  createErrorFallback: t('fleet.inspections.createError'),
  onCreated: (inspection) => {
    emit('created', inspection)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('fleet.inspections.new')"
    :banner-label="t('fleet.inspections.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <InspectionForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
