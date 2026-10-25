<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import VehicleCheckForm from '../components/VehicleCheckForm.vue'
import { vehicleCheckService } from '../services/vehicleCheckService'
import type { VehicleCheckApi } from '../types/vehicleCheck.types'

const emit = defineEmits<{ close: []; created: [vehicleCheck: VehicleCheckApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof VehicleCheckForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: vehicleCheckService.create,
  createErrorFallback: t('maintenance.vehicleChecks.createError'),
  onCreated: (vehicleCheck) => {
    emit('created', vehicleCheck)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('maintenance.vehicleChecks.new')"
    :banner-label="t('maintenance.vehicleChecks.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <VehicleCheckForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
