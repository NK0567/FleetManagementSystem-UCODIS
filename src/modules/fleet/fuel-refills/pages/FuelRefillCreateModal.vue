<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import FuelRefillForm from '../components/FuelRefillForm.vue'
import { fuelRefillService } from '../services/fuelRefillService'
import type { FuelRefillApi } from '../types/fuelRefill.types'

const emit = defineEmits<{ close: []; created: [fuelRefill: FuelRefillApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof FuelRefillForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: fuelRefillService.create,
  createErrorFallback: t('fleet.fuelRefills.createError'),
  onCreated: (fuelRefill) => {
    emit('created', fuelRefill)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('fleet.fuelRefills.new')"
    :banner-label="t('fleet.fuelRefills.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <FuelRefillForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
