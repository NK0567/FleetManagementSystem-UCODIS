<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm, type FormValidationError } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { toleranceIssues } from '../domain/quantityTolerance'
import type { QuantityToleranceApi, ToleranceUnit } from '../types/quantityTolerance.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<QuantityToleranceApi>
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
    customerNo: null as string | null,
    productNo: null as string | null,
    value: 0,
    unit: 'percent' as ToleranceUnit
  }),
  required: ['value', 'unit'],
  labelOf: (field) => t(`planning.quantityTolerances.form.${field}`),
  validate: (values) =>
    toleranceIssues(values).map(
      (issue): FormValidationError => ({
        fieldKey: issue === 'percentAbove100' ? 'value' : 'productNo',
        label: t(`planning.quantityTolerances.issue.${issue}`)
      })
    )
})

const expandedSections = ref({ general: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: { value: 'general', unit: 'general', productNo: 'general' },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('planning.quantityTolerances.form.general')"
      :summary="[initialData.scopeLabel]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('planning.quantityTolerances.form.customerNo')">
          <ReferenceLookup
            v-model="draft.customerNo"
            reference-key="recipientCustomers"
            :modal-title="t('planning.quantityTolerances.form.customerNo')"
            detail-path="/planning/customers"
            :disabled="disabled || !isNew"
          />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('planning.quantityTolerances.form.customerNoHint') }}
          </p>
        </BaseFormField>
        <BaseFormField :label="t('planning.quantityTolerances.form.productNo')">
          <ReferenceLookup
            v-model="draft.productNo"
            reference-key="products"
            :modal-title="t('planning.quantityTolerances.form.productNo')"
            detail-path="/planning/products"
            :disabled="disabled || !isNew"
          />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('planning.quantityTolerances.form.productNoHint') }}
          </p>
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="value"
          :label="t('planning.quantityTolerances.form.value')"
          :required="isRequired('value')"
        >
          <FormInput
            v-model="draft.value"
            type="number"
            :min="0"
            :max="1000000000"
            :disabled="disabled"
            :invalid="hasValidationError('value')"
          />
        </BaseFormField>
        <BaseFormField
          field="unit"
          :label="t('planning.quantityTolerances.form.unit')"
          :required="isRequired('unit')"
        >
          <OptionsSelect
            :model-value="draft.unit"
            options-key="toleranceUnit"
            :disabled="disabled"
            :invalid="hasValidationError('unit')"
            @update:model-value="draft.unit = String($event) as ToleranceUnit"
          />
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
