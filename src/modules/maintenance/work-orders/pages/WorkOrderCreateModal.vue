<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import WorkOrderForm from '../components/WorkOrderForm.vue'
import { workOrderService } from '../services/workOrderService'
import type { WorkOrderApi } from '../types/workOrder.types'

const emit = defineEmits<{ close: []; created: [workOrder: WorkOrderApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof WorkOrderForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: workOrderService.create,
  createErrorFallback: t('maintenance.workOrders.createError'),
  onCreated: (workOrder) => {
    emit('created', workOrder)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('maintenance.workOrders.new')"
    :banner-label="t('maintenance.workOrders.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <WorkOrderForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
