<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm, type FormValidationError } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { CODE_MAX_LENGTH, isValidCode } from '@/utils/code'
import { formatNumber } from '@/utils/format'
import type {
  DeviationTypeApi,
  DeviationCategory,
  DeviationSeverity,
  DeviationUnit
} from '../types/deviationType.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<DeviationTypeApi>
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
    category: 'route' as DeviationCategory,
    severity: 'major' as DeviationSeverity,
    threshold: null as number | null,
    unit: null as DeviationUnit | null,
    autoDetected: false,
    active: true
  }),
  createOnly: ['no'],
  required: ['no', 'name', 'category', 'severity'],
  labelOf: (field) => t(`fleet.deviationTypes.form.${field}`),
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
  fieldSections: { no: 'general', name: 'general', category: 'general', severity: 'general' },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('fleet.deviationTypes.form.general')"
      :summary="[draft.no, draft.name]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField field="no" :label="t('fleet.deviationTypes.form.no')" :required="isNew">
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
          :label="t('fleet.deviationTypes.form.name')"
          :required="isRequired('name')"
        >
          <FormInput
            v-model="draft.name"
            :maxlength="80"
            :disabled="disabled"
            :invalid="hasValidationError('name')"
          />
        </BaseFormField>
        <BaseFormField
          field="category"
          :label="t('fleet.deviationTypes.form.category')"
          :required="isRequired('category')"
        >
          <OptionsSelect
            :model-value="draft.category"
            options-key="deviationCategory"
            :disabled="disabled"
            :invalid="hasValidationError('category')"
            @update:model-value="draft.category = String($event) as DeviationCategory"
          />
        </BaseFormField>
        <BaseFormField
          field="severity"
          :label="t('fleet.deviationTypes.form.severity')"
          :required="isRequired('severity')"
        >
          <OptionsSelect
            :model-value="draft.severity"
            options-key="deviationSeverity"
            :disabled="disabled"
            :invalid="hasValidationError('severity')"
            @update:model-value="draft.severity = String($event) as DeviationSeverity"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.deviationTypes.form.threshold')">
          <FormInput v-model="draft.threshold" type="number" :min="0" :disabled="disabled" />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('fleet.deviationTypes.form.thresholdHint') }}
          </p>
        </BaseFormField>
        <BaseFormField :label="t('fleet.deviationTypes.form.unit')">
          <OptionsSelect
            :model-value="draft.unit"
            options-key="deviationUnit"
            :placeholder="t('common.notSpecified')"
            :disabled="disabled"
            @update:model-value="draft.unit = String($event) as DeviationUnit"
          />
        </BaseFormField>
        <BaseFormField :label="t('fleet.deviationTypes.form.autoDetected')">
          <ToggleSwitch v-model="draft.autoDetected" :disabled="disabled" />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('fleet.deviationTypes.form.autoDetectedHint') }}
          </p>
        </BaseFormField>
        <BaseFormField :label="t('fleet.deviationTypes.form.active')">
          <ToggleSwitch v-model="draft.active" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField v-if="!isNew" :label="t('fleet.deviationTypes.form.deviationCount')">
          <FormInput :model-value="formatNumber(initialData.deviationCount ?? 0, 0)" disabled />
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
