<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import PurchaseRequestForm from '../components/PurchaseRequestForm.vue'
import { purchaseRequestService } from '../services/purchaseRequestService'
import type { PurchaseRequestApi } from '../types/purchaseRequest.types'

const emit = defineEmits<{ close: []; created: [purchaseRequest: PurchaseRequestApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof PurchaseRequestForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: purchaseRequestService.create,
  createErrorFallback: t('maintenance.purchaseRequests.createError'),
  onCreated: (purchaseRequest) => {
    emit('created', purchaseRequest)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('maintenance.purchaseRequests.new')"
    :banner-label="t('maintenance.purchaseRequests.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <PurchaseRequestForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
