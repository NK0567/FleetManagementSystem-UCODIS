<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import FuelCardTransactionForm from '../components/FuelCardTransactionForm.vue'
import { fuelCardTransactionService } from '../services/fuelCardTransactionService'
import type { FuelCardTransactionApi } from '../types/fuelCardTransaction.types'

const emit = defineEmits<{ close: []; created: [fuelCardTransaction: FuelCardTransactionApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof FuelCardTransactionForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: fuelCardTransactionService.create,
  createErrorFallback: t('fleet.fuelCardTransactions.createError'),
  onCreated: (fuelCardTransaction) => {
    emit('created', fuelCardTransaction)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('fleet.fuelCardTransactions.new')"
    :banner-label="t('fleet.fuelCardTransactions.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <FuelCardTransactionForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
