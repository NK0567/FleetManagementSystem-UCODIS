<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import MedicalFollowUpForm from '../components/MedicalFollowUpForm.vue'
import { medicalFollowUpService } from '../services/medicalFollowUpService'
import type { MedicalFollowUpApi } from '../types/medicalFollowUp.types'

const emit = defineEmits<{ close: []; created: [item: MedicalFollowUpApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof MedicalFollowUpForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: medicalFollowUpService.create,
  createErrorFallback: t('fleet.medicalFollowUps.createError'),
  onCreated: (item) => {
    emit('created', item)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('fleet.medicalFollowUps.new')"
    :banner-label="t('fleet.medicalFollowUps.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <MedicalFollowUpForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
