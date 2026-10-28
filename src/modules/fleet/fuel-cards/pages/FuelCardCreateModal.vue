<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import FuelCardForm from '../components/FuelCardForm.vue'
import { fuelCardService } from '../services/fuelCardService'
import type { FuelCardApi } from '../types/fuelCard.types'

const emit = defineEmits<{ close: []; created: [fuelCard: FuelCardApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof FuelCardForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: fuelCardService.create,
  createErrorFallback: t('fleet.fuelCards.createError'),
  onCreated: (fuelCard) => {
    emit('created', fuelCard)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('fleet.fuelCards.new')"
    :banner-label="t('fleet.fuelCards.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <FuelCardForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
