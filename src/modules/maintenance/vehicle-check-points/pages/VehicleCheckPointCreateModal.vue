<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import VehicleCheckPointForm from '../components/VehicleCheckPointForm.vue'
import { vehicleCheckPointService } from '../services/vehicleCheckPointService'
import type { VehicleCheckPointApi } from '../types/vehicleCheckPoint.types'

const emit = defineEmits<{ close: []; created: [vehicleCheckPoint: VehicleCheckPointApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof VehicleCheckPointForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: vehicleCheckPointService.create,
  createErrorFallback: t('maintenance.vehicleCheckPoints.createError'),
  onCreated: (vehicleCheckPoint) => {
    emit('created', vehicleCheckPoint)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('maintenance.vehicleCheckPoints.new')"
    :banner-label="t('maintenance.vehicleCheckPoints.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <VehicleCheckPointForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
