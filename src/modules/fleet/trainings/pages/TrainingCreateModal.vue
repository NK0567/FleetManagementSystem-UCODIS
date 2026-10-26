<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import TrainingForm from '../components/TrainingForm.vue'
import { trainingService } from '../services/trainingService'
import type { TrainingApi } from '../types/training.types'

const emit = defineEmits<{ close: []; created: [training: TrainingApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof TrainingForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: trainingService.create,
  createErrorFallback: t('fleet.trainings.createError'),
  onCreated: (training) => {
    emit('created', training)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('fleet.trainings.new')"
    :banner-label="t('fleet.trainings.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <TrainingForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
