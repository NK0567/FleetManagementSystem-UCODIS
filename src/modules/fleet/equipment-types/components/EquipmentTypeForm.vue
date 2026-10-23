<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm, type FormValidationError } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { CODE_MAX_LENGTH, isValidCode } from '@/utils/code'
import type { EquipmentTypeApi, EquipmentCapability } from '../types/equipmentType.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<EquipmentTypeApi>
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
    capability: 'other' as EquipmentCapability,
    hasDueDate: false,
    noticeDays: 30,
    active: true
  }),
  createOnly: ['no'],
  required: ['no', 'name', 'capability', 'noticeDays'],
  labelOf: (field) => t(`fleet.equipmentTypes.form.${field}`),
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
  fieldSections: { no: 'general', name: 'general', capability: 'general', noticeDays: 'general' },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('fleet.equipmentTypes.form.general')"
      :summary="[draft.no, draft.name]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField field="no" :label="t('fleet.equipmentTypes.form.no')" :required="isNew">
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
          :label="t('fleet.equipmentTypes.form.name')"
          :required="isRequired('name')"
        >
          <FormInput
            v-model="draft.name"
            :maxlength="60"
            :disabled="disabled"
            :invalid="hasValidationError('name')"
          />
        </BaseFormField>
        <BaseFormField
          field="capability"
          :label="t('fleet.equipmentTypes.form.capability')"
          :required="isRequired('capability')"
        >
          <OptionsSelect
            :model-value="draft.capability"
            options-key="equipmentCapability"
            :disabled="disabled"
            :invalid="hasValidationError('capability')"
            @update:model-value="draft.capability = String($event) as EquipmentCapability"
          />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('fleet.equipmentTypes.form.capabilityHint') }}
          </p>
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.equipmentTypes.form.hasDueDate')">
          <ToggleSwitch v-model="draft.hasDueDate" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField
          field="noticeDays"
          :label="t('fleet.equipmentTypes.form.noticeDays')"
          :required="isRequired('noticeDays')"
        >
          <FormInput
            v-model="draft.noticeDays"
            type="number"
            :min="0"
            :max="365"
            :disabled="disabled"
            :invalid="hasValidationError('noticeDays')"
          />
        </BaseFormField>
        <BaseFormField :label="t('fleet.equipmentTypes.form.active')">
          <ToggleSwitch v-model="draft.active" :disabled="disabled" />
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
