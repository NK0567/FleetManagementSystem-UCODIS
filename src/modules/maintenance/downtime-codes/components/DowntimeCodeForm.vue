<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm, type FormValidationError } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { CODE_MAX_LENGTH, isValidCode } from '@/utils/code'
import type { DowntimeCodeApi, DowntimeFamily, DowntimeRole } from '../types/downtimeCode.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<DowntimeCodeApi>
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
    family: 'technical' as DowntimeFamily,
    systemRole: null as DowntimeRole | null,
    active: true
  }),
  createOnly: ['no'],
  required: ['no', 'name', 'family'],
  labelOf: (field) => t(`maintenance.downtimeCodes.form.${field}`),
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
  fieldSections: { no: 'general', name: 'general', family: 'general' },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('maintenance.downtimeCodes.form.general')"
      :summary="[draft.no, draft.name]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField field="no" :label="t('maintenance.downtimeCodes.form.no')" :required="isNew">
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
          :label="t('maintenance.downtimeCodes.form.name')"
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
          field="family"
          :label="t('maintenance.downtimeCodes.form.family')"
          :required="isRequired('family')"
        >
          <OptionsSelect
            :model-value="draft.family"
            options-key="downtimeFamily"
            :disabled="disabled"
            :invalid="hasValidationError('family')"
            @update:model-value="draft.family = String($event) as DowntimeFamily"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('maintenance.downtimeCodes.form.systemRole')">
          <OptionsSelect
            :model-value="draft.systemRole"
            options-key="downtimeRole"
            :placeholder="t('common.notSpecified')"
            :disabled="disabled"
            @update:model-value="draft.systemRole = String($event) as DowntimeRole"
          />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('maintenance.downtimeCodes.form.systemRoleHint') }}
          </p>
        </BaseFormField>
        <BaseFormField :label="t('maintenance.downtimeCodes.form.active')">
          <ToggleSwitch v-model="draft.active" :disabled="disabled" />
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
