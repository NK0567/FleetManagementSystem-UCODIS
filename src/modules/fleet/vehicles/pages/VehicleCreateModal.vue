<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import VehicleForm from '../components/VehicleForm.vue'
import { vehicleService } from '../services/vehicleService'
import type { VehicleApi } from '../types/vehicle.types'

const emit = defineEmits<{ close: []; created: [vehicle: VehicleApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof VehicleForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: vehicleService.create,
  createErrorFallback: t('fleet.vehicles.createError'),
  onCreated: (vehicle) => {
    emit('created', vehicle)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('fleet.vehicles.new')"
    :banner-label="t('fleet.vehicles.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <VehicleForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
