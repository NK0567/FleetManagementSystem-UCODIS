<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import PlanningReasonForm from '../components/PlanningReasonForm.vue'
import { planningReasonService } from '../services/planningReasonService'
import type { PlanningReasonApi } from '../types/planningReason.types'

const emit = defineEmits<{ close: []; created: [planningReason: PlanningReasonApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof PlanningReasonForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: planningReasonService.create,
  createErrorFallback: t('planning.reasons.createError'),
  onCreated: (planningReason) => {
    emit('created', planningReason)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('planning.reasons.new')"
    :banner-label="t('planning.reasons.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <PlanningReasonForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
