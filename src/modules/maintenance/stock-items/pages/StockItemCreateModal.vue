<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import StockItemForm from '../components/StockItemForm.vue'
import { stockItemService } from '../services/stockItemService'
import type { StockItemApi } from '../types/stockItem.types'

const emit = defineEmits<{ close: []; created: [stockItem: StockItemApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof StockItemForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: stockItemService.create,
  createErrorFallback: t('maintenance.stockItems.createError'),
  onCreated: (stockItem) => {
    emit('created', stockItem)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('maintenance.stockItems.new')"
    :banner-label="t('maintenance.stockItems.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <StockItemForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
