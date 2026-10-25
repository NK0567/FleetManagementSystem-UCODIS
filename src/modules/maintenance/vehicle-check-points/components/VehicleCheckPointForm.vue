<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm, type FormValidationError } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { CODE_MAX_LENGTH, isValidCode } from '@/utils/code'
import type { VehicleCheckMoment } from '@/modules/maintenance/vehicle-checks/domain/vehicleCheck'
import type { VehicleCheckPointApi } from '../types/vehicleCheckPoint.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<VehicleCheckPointApi>
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
    moment: 'before_loading' as VehicleCheckMoment,
    label: '',
    blocking: false,
    sortOrder: 0,
    active: true
  }),
  createOnly: ['no'],
  required: ['no', 'moment', 'label', 'sortOrder'],
  labelOf: (field) => t(`maintenance.vehicleCheckPoints.form.${field}`),
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
  fieldSections: { no: 'general', moment: 'general', label: 'general', sortOrder: 'general' },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('maintenance.vehicleCheckPoints.form.general')"
      :summary="[draft.no, draft.label]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="no"
          :label="t('maintenance.vehicleCheckPoints.form.no')"
          :required="isNew"
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
          field="moment"
          :label="t('maintenance.vehicleCheckPoints.form.moment')"
          :required="isRequired('moment')"
        >
          <OptionsSelect
            :model-value="draft.moment"
            options-key="vehicleCheckMoment"
            :disabled="disabled"
            :invalid="hasValidationError('moment')"
            @update:model-value="draft.moment = String($event) as VehicleCheckMoment"
          />
        </BaseFormField>
        <BaseFormField
          field="label"
          :label="t('maintenance.vehicleCheckPoints.form.label')"
          :required="isRequired('label')"
        >
          <FormInput
            v-model="draft.label"
            :maxlength="120"
            :disabled="disabled"
            :invalid="hasValidationError('label')"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('maintenance.vehicleCheckPoints.form.blocking')">
          <ToggleSwitch v-model="draft.blocking" :disabled="disabled" />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('maintenance.vehicleCheckPoints.form.blockingHint') }}
          </p>
        </BaseFormField>
        <BaseFormField
          field="sortOrder"
          :label="t('maintenance.vehicleCheckPoints.form.sortOrder')"
          :required="isRequired('sortOrder')"
        >
          <FormInput
            v-model="draft.sortOrder"
            type="number"
            :disabled="disabled"
            :invalid="hasValidationError('sortOrder')"
          />
        </BaseFormField>
        <BaseFormField :label="t('maintenance.vehicleCheckPoints.form.active')">
          <ToggleSwitch v-model="draft.active" :disabled="disabled" />
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
