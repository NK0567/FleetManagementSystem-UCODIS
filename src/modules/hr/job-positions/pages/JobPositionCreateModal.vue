<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import JobPositionForm from '../components/JobPositionForm.vue'
import { jobPositionService } from '../services/jobPositionService'
import type { JobPositionApi } from '../types/jobPosition.types'

const emit = defineEmits<{ close: []; created: [position: JobPositionApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof JobPositionForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: jobPositionService.create,
  createErrorFallback: t('hr.jobPositions.createError'),
  onCreated: (position) => {
    emit('created', position)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('hr.jobPositions.new')"
    :banner-label="t('hr.jobPositions.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <JobPositionForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
