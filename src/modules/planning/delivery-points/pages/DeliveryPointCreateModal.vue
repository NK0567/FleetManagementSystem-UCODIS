<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import DeliveryPointForm from '../components/DeliveryPointForm.vue'
import { deliveryPointService } from '../services/deliveryPointService'
import type { DeliveryPointApi } from '../types/deliveryPoint.types'

const emit = defineEmits<{ close: []; created: [deliveryPoint: DeliveryPointApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof DeliveryPointForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: deliveryPointService.create,
  createErrorFallback: t('planning.deliveryPoints.createError'),
  onCreated: (deliveryPoint) => {
    emit('created', deliveryPoint)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('planning.deliveryPoints.new')"
    :banner-label="t('planning.deliveryPoints.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <DeliveryPointForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
