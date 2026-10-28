<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { CODE_MAX_LENGTH, isValidCode } from '@/utils/code'
import { formatNumber } from '@/utils/format'
import type { EmployeeCategoryApi } from '../types/employeeCategory.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<EmployeeCategoryApi>
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
  empty: () => ({ no: '', name: '', description: '', annualLeaveDays: 0, active: true }),
  createOnly: ['no'],
  required: ['no', 'name', 'annualLeaveDays'],
  labelOf: (field) => t(`hr.employeeCategories.form.${field}`),
  validate: (values) =>
    values.no && !isValidCode(values.no)
      ? [{ fieldKey: 'no', label: t('common.validation.codeFormat') }]
      : []
})

const expandedSections = ref({ general: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: { no: 'general', name: 'general', annualLeaveDays: 'general' },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('hr.employeeCategories.form.general')"
      :summary="[draft.no, draft.name]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="no"
          :label="t('hr.employeeCategories.form.no')"
          :required="isNew && isRequired('no')"
        >
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
          :label="t('hr.employeeCategories.form.name')"
          :required="isRequired('name')"
        >
          <FormInput
            v-model="draft.name"
            :maxlength="60"
            :disabled="disabled"
            :invalid="hasValidationError('name')"
          />
        </BaseFormField>
        <BaseFormField :label="t('hr.employeeCategories.form.description')">
          <FormInput v-model="draft.description" :maxlength="200" :disabled="disabled" />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="annualLeaveDays"
          :label="t('hr.employeeCategories.form.annualLeaveDays')"
          :required="isRequired('annualLeaveDays')"
        >
          <FormInput
            v-model="draft.annualLeaveDays"
            type="number"
            :min="0"
            :max="60"
            :disabled="disabled"
            :invalid="hasValidationError('annualLeaveDays')"
          />
        </BaseFormField>
        <BaseFormField :label="t('hr.employeeCategories.form.active')">
          <ToggleSwitch v-model="draft.active" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField v-if="!isNew" :label="t('hr.employeeCategories.form.employeeCount')">
          <FormInput :model-value="formatNumber(initialData.employeeCount ?? 0, 0)" disabled />
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
