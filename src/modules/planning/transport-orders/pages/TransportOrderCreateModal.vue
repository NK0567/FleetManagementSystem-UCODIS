<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import TransportOrderForm from '../components/TransportOrderForm.vue'
import { transportOrderService } from '../services/transportOrderService'
import type { TransportOrderApi } from '../types/transportOrder.types'

const emit = defineEmits<{ close: []; created: [order: TransportOrderApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof TransportOrderForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: transportOrderService.create,
  createErrorFallback: t('planning.transportOrders.createError'),
  onCreated: (order) => {
    emit('created', order)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('planning.transportOrders.new')"
    :banner-label="t('planning.transportOrders.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <TransportOrderForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
