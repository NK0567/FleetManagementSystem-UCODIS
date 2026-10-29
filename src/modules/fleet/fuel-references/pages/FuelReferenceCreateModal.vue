<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import FuelReferenceForm from '../components/FuelReferenceForm.vue'
import { fuelReferenceService } from '../services/fuelReferenceService'
import type { FuelReferenceApi } from '../types/fuelReference.types'

const emit = defineEmits<{ close: []; created: [fuelReference: FuelReferenceApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof FuelReferenceForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: fuelReferenceService.create,
  createErrorFallback: t('fleet.fuelReferences.createError'),
  onCreated: (fuelReference) => {
    emit('created', fuelReference)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('fleet.fuelReferences.new')"
    :banner-label="t('fleet.fuelReferences.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <FuelReferenceForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
