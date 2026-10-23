<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import VehicleTypeForm from '../components/VehicleTypeForm.vue'
import { vehicleTypeService } from '../services/vehicleTypeService'
import type { VehicleTypeApi } from '../types/vehicleType.types'

const emit = defineEmits<{ close: []; created: [vehicleType: VehicleTypeApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof VehicleTypeForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: vehicleTypeService.create,
  createErrorFallback: t('fleet.vehicleTypes.createError'),
  onCreated: (vehicleType) => {
    emit('created', vehicleType)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('fleet.vehicleTypes.new')"
    :banner-label="t('fleet.vehicleTypes.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <VehicleTypeForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
