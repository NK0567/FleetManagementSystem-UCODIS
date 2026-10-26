<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm, type FormValidationError } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { CODE_MAX_LENGTH, isValidCode } from '@/utils/code'
import type { StockItemApi } from '../types/stockItem.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<StockItemApi>
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
    no: '',
    name: '',
    subsystemNo: '',
    supplierNo: null as string | null,
    unitPrice: 0,
    alertThreshold: 0,
    active: true
  }),
  createOnly: ['no'],
  required: ['no', 'name', 'subsystemNo', 'unitPrice', 'alertThreshold'],
  labelOf: (field) => t(`maintenance.stockItems.form.${field}`),
  validate: (values) => {
    const errors: FormValidationError[] = []
    if (values.no && !isValidCode(values.no)) {
      errors.push({ fieldKey: 'no', label: t('common.validation.codeFormat') })
    }
    return errors
  }
})

const expandedSections = ref({ general: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: {
    no: 'general',
    name: 'general',
    subsystemNo: 'general',
    unitPrice: 'general',
    alertThreshold: 'general'
  },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('maintenance.stockItems.form.general')"
      :summary="[draft.no, draft.name]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField field="no" :label="t('maintenance.stockItems.form.no')" :required="isNew">
          <FormInput
            v-model="draft.no"
            :maxlength="CODE_MAX_LENGTH"
            :disabled="disabled || !isNew"
            :show-lock-icon="!isNew"
            :invalid="hasValidationError('no')"
          />
        </BaseFormField>
        <BaseFormField
          field="name"
          :label="t('maintenance.stockItems.form.name')"
          :required="isRequired('name')"
        >
          <FormInput
            v-model="draft.name"
            :maxlength="120"
            :disabled="disabled"
            :invalid="hasValidationError('name')"
          />
        </BaseFormField>
        <BaseFormField
          field="subsystemNo"
          :label="t('maintenance.stockItems.form.subsystemNo')"
          :required="isRequired('subsystemNo')"
        >
          <ReferenceLookup
            v-model="draft.subsystemNo"
            reference-key="failureSubsystems"
            :modal-title="t('maintenance.stockItems.form.subsystemNo')"
            :disabled="disabled"
            :invalid="hasValidationError('subsystemNo')"
          />
        </BaseFormField>
        <BaseFormField :label="t('maintenance.stockItems.form.supplierNo')">
          <ReferenceLookup
            v-model="draft.supplierNo"
            reference-key="partsSuppliers"
            :modal-title="t('maintenance.stockItems.form.supplierNo')"
            detail-path="/fleet/providers"
            :disabled="disabled"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="unitPrice"
          :label="t('maintenance.stockItems.form.unitPrice')"
          :required="isRequired('unitPrice')"
        >
          <FormInput
            v-model="draft.unitPrice"
            type="number"
            :disabled="disabled"
            :invalid="hasValidationError('unitPrice')"
          />
        </BaseFormField>
        <BaseFormField
          field="alertThreshold"
          :label="t('maintenance.stockItems.form.alertThreshold')"
          :required="isRequired('alertThreshold')"
        >
          <FormInput
            v-model="draft.alertThreshold"
            type="number"
            :disabled="disabled"
            :invalid="hasValidationError('alertThreshold')"
          />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('maintenance.stockItems.form.alertThresholdHint') }}
          </p>
        </BaseFormField>
        <BaseFormField :label="t('maintenance.stockItems.form.active')">
          <ToggleSwitch v-model="draft.active" :disabled="disabled" />
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
