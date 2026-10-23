<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import DeviationTypeForm from '../components/DeviationTypeForm.vue'
import { deviationTypeService } from '../services/deviationTypeService'
import type { DeviationTypeApi } from '../types/deviationType.types'

const emit = defineEmits<{ close: []; created: [deviationType: DeviationTypeApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof DeviationTypeForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: deviationTypeService.create,
  createErrorFallback: t('fleet.deviationTypes.createError'),
  onCreated: (deviationType) => {
    emit('created', deviationType)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('fleet.deviationTypes.new')"
    :banner-label="t('fleet.deviationTypes.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <DeviationTypeForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
