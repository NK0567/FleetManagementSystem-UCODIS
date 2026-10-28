<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm, type FormValidationError } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { CODE_MAX_LENGTH, isValidCode } from '@/utils/code'
import { formatNumber } from '@/utils/format'
import type { InfractionTypeApi, InfractionSeverity } from '../types/infractionType.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<InfractionTypeApi>
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
    defaultSeverity: 'major' as InfractionSeverity,
    active: true
  }),
  createOnly: ['no'],
  required: ['no', 'name', 'defaultSeverity'],
  labelOf: (field) => t(`fleet.infractionTypes.form.${field}`),
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
  fieldSections: { no: 'general', name: 'general', defaultSeverity: 'general' },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('fleet.infractionTypes.form.general')"
      :summary="[draft.no, draft.name]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField field="no" :label="t('fleet.infractionTypes.form.no')" :required="isNew">
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
          :label="t('fleet.infractionTypes.form.name')"
          :required="isRequired('name')"
        >
          <FormInput
            v-model="draft.name"
            :maxlength="80"
            :disabled="disabled"
            :invalid="hasValidationError('name')"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="defaultSeverity"
          :label="t('fleet.infractionTypes.form.defaultSeverity')"
          :required="isRequired('defaultSeverity')"
        >
          <OptionsSelect
            :model-value="draft.defaultSeverity"
            options-key="infractionSeverity"
            :disabled="disabled"
            :invalid="hasValidationError('defaultSeverity')"
            @update:model-value="draft.defaultSeverity = String($event) as InfractionSeverity"
          />
        </BaseFormField>
        <BaseFormField :label="t('fleet.infractionTypes.form.active')">
          <ToggleSwitch v-model="draft.active" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField v-if="!isNew" :label="t('fleet.infractionTypes.form.infractionCount')">
          <FormInput :model-value="formatNumber(initialData.infractionCount ?? 0, 0)" disabled />
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
