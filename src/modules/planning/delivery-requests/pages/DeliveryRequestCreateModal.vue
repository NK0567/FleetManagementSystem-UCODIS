<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import DeliveryRequestForm from '../components/DeliveryRequestForm.vue'
import { deliveryRequestService } from '../services/deliveryRequestService'
import type { DeliveryRequestApi } from '../types/deliveryRequest.types'

const emit = defineEmits<{ close: []; created: [deliveryRequest: DeliveryRequestApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof DeliveryRequestForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: deliveryRequestService.create,
  createErrorFallback: t('planning.deliveryRequests.createError'),
  onCreated: (deliveryRequest) => {
    emit('created', deliveryRequest)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('planning.deliveryRequests.new')"
    :banner-label="t('planning.deliveryRequests.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <DeliveryRequestForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
