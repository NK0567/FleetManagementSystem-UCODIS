<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm, type FormValidationError } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { CODE_MAX_LENGTH, isValidCode } from '@/utils/code'
import type { CheckPointApi, CheckPointScope } from '../types/checkPoint.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<CheckPointApi>
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
    label: '',
    scope: 'vehicle' as CheckPointScope,
    blocking: false,
    sortOrder: 100,
    active: true
  }),
  createOnly: ['no'],
  required: ['no', 'label', 'scope', 'sortOrder'],
  labelOf: (field) => t(`fleet.checkPoints.form.${field}`),
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
  fieldSections: { no: 'general', label: 'general', scope: 'general', sortOrder: 'general' },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('fleet.checkPoints.form.general')"
      :summary="[draft.no, draft.label]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField field="no" :label="t('fleet.checkPoints.form.no')" :required="isNew">
          <FormInput
            v-model="draft.no"
            :maxlength="CODE_MAX_LENGTH"
            :disabled="disabled || !isNew"
            :show-lock-icon="!isNew"
            :invalid="hasValidationError('no')"
          />
        </BaseFormField>
        <BaseFormField
          field="label"
          :label="t('fleet.checkPoints.form.label')"
          :required="isRequired('label')"
        >
          <FormInput
            v-model="draft.label"
            :maxlength="120"
            :disabled="disabled"
            :invalid="hasValidationError('label')"
          />
        </BaseFormField>
        <BaseFormField
          field="scope"
          :label="t('fleet.checkPoints.form.scope')"
          :required="isRequired('scope')"
        >
          <OptionsSelect
            :model-value="draft.scope"
            options-key="checkPointScope"
            :disabled="disabled"
            :invalid="hasValidationError('scope')"
            @update:model-value="draft.scope = String($event) as CheckPointScope"
          />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('fleet.checkPoints.form.scopeHint') }}
          </p>
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.checkPoints.form.blocking')">
          <ToggleSwitch v-model="draft.blocking" :disabled="disabled" />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('fleet.checkPoints.form.blockingHint') }}
          </p>
        </BaseFormField>
        <BaseFormField
          field="sortOrder"
          :label="t('fleet.checkPoints.form.sortOrder')"
          :required="isRequired('sortOrder')"
        >
          <FormInput
            v-model="draft.sortOrder"
            type="number"
            :min="1"
            :max="999"
            :disabled="disabled"
            :invalid="hasValidationError('sortOrder')"
          />
        </BaseFormField>
        <BaseFormField :label="t('fleet.checkPoints.form.active')">
          <ToggleSwitch v-model="draft.active" :disabled="disabled" />
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
