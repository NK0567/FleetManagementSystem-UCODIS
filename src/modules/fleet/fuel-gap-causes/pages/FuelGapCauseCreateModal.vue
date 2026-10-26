<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import FuelGapCauseForm from '../components/FuelGapCauseForm.vue'
import { fuelGapCauseService } from '../services/fuelGapCauseService'
import type { FuelGapCauseApi } from '../types/fuelGapCause.types'

const emit = defineEmits<{ close: []; created: [fuelGapCause: FuelGapCauseApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof FuelGapCauseForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: fuelGapCauseService.create,
  createErrorFallback: t('fleet.fuelGapCauses.createError'),
  onCreated: (fuelGapCause) => {
    emit('created', fuelGapCause)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('fleet.fuelGapCauses.new')"
    :banner-label="t('fleet.fuelGapCauses.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <FuelGapCauseForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
