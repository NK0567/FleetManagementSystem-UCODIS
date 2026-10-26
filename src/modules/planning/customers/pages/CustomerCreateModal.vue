<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import CustomerForm from '../components/CustomerForm.vue'
import { customerService } from '../services/customerService'
import type { CustomerApi } from '../types/customer.types'

const emit = defineEmits<{ close: []; created: [customer: CustomerApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof CustomerForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: customerService.create,
  createErrorFallback: t('planning.customers.createError'),
  onCreated: (customer) => {
    emit('created', customer)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('planning.customers.new')"
    :banner-label="t('planning.customers.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <CustomerForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
