<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import MobileInterventionForm from '../components/MobileInterventionForm.vue'
import { mobileInterventionService } from '../services/mobileInterventionService'
import type { MobileInterventionApi } from '../types/mobileIntervention.types'

const emit = defineEmits<{ close: []; created: [mobileIntervention: MobileInterventionApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof MobileInterventionForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: mobileInterventionService.create,
  createErrorFallback: t('maintenance.mobileInterventions.createError'),
  onCreated: (mobileIntervention) => {
    emit('created', mobileIntervention)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('maintenance.mobileInterventions.new')"
    :banner-label="t('maintenance.mobileInterventions.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <MobileInterventionForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
