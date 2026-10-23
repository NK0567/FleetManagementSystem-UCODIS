<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm, type FormValidationError } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { CODE_MAX_LENGTH, isValidCode } from '@/utils/code'
import { vehicleTypeIssues, type VehicleTypeIssue } from '../domain/vehicleType'
import type { VehicleTypeApi, CouplingRole } from '../types/vehicleType.types'

const ISSUE_FIELD: Record<VehicleTypeIssue, string> = {
  motorizedCannotBeTowed: 'couplingRole',
  unpoweredCannotTow: 'couplingRole',
  compartmentsNeedGoods: 'hasCompartments'
}

const props = withDefaults(
  defineProps<{
    initialData?: Partial<VehicleTypeApi>
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
    motorized: false,
    couplingRole: 'none' as CouplingRole,
    carriesGoods: false,
    hasCompartments: false,
    active: true
  }),
  createOnly: ['no'],
  required: ['no', 'name', 'couplingRole'],
  labelOf: (field) => t(`fleet.vehicleTypes.form.${field}`),
  validate: (values) => {
    const errors: FormValidationError[] = []
    if (values.no && !isValidCode(values.no)) {
      errors.push({ fieldKey: 'no', label: t('common.validation.codeFormat') })
    }
    for (const issue of vehicleTypeIssues(values)) {
      errors.push({ fieldKey: ISSUE_FIELD[issue], label: t(`fleet.vehicleTypes.issue.${issue}`) })
    }
    return errors
  }
})

const expandedSections = ref({ general: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: { no: 'general', name: 'general', couplingRole: 'general' },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('fleet.vehicleTypes.form.general')"
      :summary="[draft.no, draft.name]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField field="no" :label="t('fleet.vehicleTypes.form.no')" :required="isNew">
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
          :label="t('fleet.vehicleTypes.form.name')"
          :required="isRequired('name')"
        >
          <FormInput
            v-model="draft.name"
            :maxlength="60"
            :disabled="disabled"
            :invalid="hasValidationError('name')"
          />
        </BaseFormField>
        <BaseFormField :label="t('fleet.vehicleTypes.form.motorized')">
          <ToggleSwitch v-model="draft.motorized" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField
          field="couplingRole"
          :label="t('fleet.vehicleTypes.form.couplingRole')"
          :required="isRequired('couplingRole')"
        >
          <OptionsSelect
            :model-value="draft.couplingRole"
            options-key="couplingRole"
            :disabled="disabled"
            :invalid="hasValidationError('couplingRole')"
            @update:model-value="draft.couplingRole = String($event) as CouplingRole"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.vehicleTypes.form.carriesGoods')">
          <ToggleSwitch v-model="draft.carriesGoods" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField :label="t('fleet.vehicleTypes.form.hasCompartments')">
          <ToggleSwitch v-model="draft.hasCompartments" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField :label="t('fleet.vehicleTypes.form.active')">
          <ToggleSwitch v-model="draft.active" :disabled="disabled" />
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
