<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import InsurancePolicyForm from '../components/InsurancePolicyForm.vue'
import { insurancePolicyService } from '../services/insurancePolicyService'
import type { InsurancePolicyApi } from '../types/insurancePolicy.types'

const emit = defineEmits<{ close: []; created: [insurancePolicy: InsurancePolicyApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof InsurancePolicyForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: insurancePolicyService.create,
  createErrorFallback: t('fleet.insurancePolicies.createError'),
  onCreated: (insurancePolicy) => {
    emit('created', insurancePolicy)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('fleet.insurancePolicies.new')"
    :banner-label="t('fleet.insurancePolicies.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <InsurancePolicyForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
