<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { formatDateTime } from '@/utils/format'
import type { PurchaseRequestApi } from '../types/purchaseRequest.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<PurchaseRequestApi>
    disabled?: boolean
    isNew?: boolean
    validationErrors?: string[]
  }>(),
  {
    initialData: () => ({}),
    disabled: false,
    isNew: false,
    validationErrors: () => []
  }
)

const { t } = useI18n()

const { draft, isRequired, expose } = useEntityForm({
  initialData: () => props.initialData,
  empty: () => ({
    itemNo: null as string | null,
    label: '',
    quantity: 0,
    estimatedAmount: null as number | null,
    workOrderNo: null as string | null
  }),
  required: ['label', 'quantity'],
  labelOf: (field) => t(`maintenance.purchaseRequests.form.${field}`)
})

const expandedSections = ref({ general: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: { label: 'general', quantity: 'general' },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('maintenance.purchaseRequests.form.general')"
      :summary="[draft.label]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('maintenance.purchaseRequests.form.itemNo')">
          <ReferenceLookup
            v-model="draft.itemNo"
            reference-key="stockItems"
            :modal-title="t('maintenance.purchaseRequests.form.itemNo')"
            detail-path="/maintenance/stock-items"
            :disabled="disabled || !isNew"
          />
        </BaseFormField>
        <BaseFormField
          field="label"
          :label="t('maintenance.purchaseRequests.form.label')"
          :required="isRequired('label')"
        >
          <FormInput
            v-model="draft.label"
            :maxlength="160"
            :disabled="disabled"
            :invalid="hasValidationError('label')"
          />
        </BaseFormField>
        <BaseFormField
          field="quantity"
          :label="t('maintenance.purchaseRequests.form.quantity')"
          :required="isRequired('quantity')"
        >
          <FormInput
            v-model="draft.quantity"
            type="number"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('quantity')"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('maintenance.purchaseRequests.form.estimatedAmount')">
          <FormInput v-model="draft.estimatedAmount" type="number" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField :label="t('maintenance.purchaseRequests.form.workOrderNo')">
          <ReferenceLookup
            v-model="draft.workOrderNo"
            reference-key="openWorkOrders"
            :modal-title="t('maintenance.purchaseRequests.form.workOrderNo')"
            detail-path="/maintenance/work-orders"
            :disabled="disabled || !isNew"
          />
        </BaseFormField>
        <p v-if="!isNew && initialData.erpSentAt" class="text-xs text-muted-foreground">
          {{
            t('maintenance.purchaseRequests.form.erpSent', {
              reference: initialData.erpReference,
              date: formatDateTime(initialData.erpSentAt)
            })
          }}
        </p>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
