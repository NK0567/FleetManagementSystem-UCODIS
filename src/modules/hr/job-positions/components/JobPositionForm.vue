<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { CODE_MAX_LENGTH, isValidCode } from '@/utils/code'
import type { JobPositionApi } from '../types/jobPosition.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<JobPositionApi>
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
    orgUnitNo: '',
    defaultCategoryNo: '',
    drives: false,
    plannedHeadcount: 0,
    responsibilities: [] as string[]
  }),
  createOnly: ['no'],
  required: ['no', 'name', 'orgUnitNo', 'defaultCategoryNo'],
  labelOf: (field) => t(`hr.jobPositions.form.${field}`),
  validate: (values) =>
    values.no && !isValidCode(values.no)
      ? [{ fieldKey: 'no', label: t('common.validation.codeFormat') }]
      : []
})

/** One responsibility per line; blank lines are dropped by the server. */
const responsibilitiesText = computed({
  get: () => draft.responsibilities.join('\n'),
  set: (text: string) => {
    draft.responsibilities = text.split('\n')
  }
})

const expandedSections = ref({ general: true, responsibilities: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: {
    no: 'general',
    name: 'general',
    orgUnitNo: 'general',
    defaultCategoryNo: 'general'
  },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('hr.jobPositions.form.general')"
      :summary="[draft.no, draft.name]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField field="no" :label="t('hr.jobPositions.form.no')" :required="isNew">
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
          :label="t('hr.jobPositions.form.name')"
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
          field="orgUnitNo"
          :label="t('hr.jobPositions.form.orgUnitNo')"
          :required="isRequired('orgUnitNo')"
        >
          <ReferenceLookup
            v-model="draft.orgUnitNo"
            reference-key="orgUnits"
            :disabled="disabled"
            :invalid="hasValidationError('orgUnitNo')"
          />
        </BaseFormField>
        <BaseFormField
          field="defaultCategoryNo"
          :label="t('hr.jobPositions.form.defaultCategoryNo')"
          :required="isRequired('defaultCategoryNo')"
        >
          <ReferenceLookup
            v-model="draft.defaultCategoryNo"
            reference-key="employeeCategories"
            :disabled="disabled"
            :invalid="hasValidationError('defaultCategoryNo')"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('hr.jobPositions.form.drives')">
          <ToggleSwitch v-model="draft.drives" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField :label="t('hr.jobPositions.form.plannedHeadcount')">
          <FormInput v-model="draft.plannedHeadcount" type="number" :min="0" :disabled="disabled" />
        </BaseFormField>
        <template v-if="!isNew">
          <BaseFormField :label="t('hr.jobPositions.form.actualHeadcount')">
            <FormInput :model-value="initialData.actualHeadcount" disabled />
          </BaseFormField>
          <BaseFormField :label="t('hr.jobPositions.form.headcountGap')">
            <FormInput :model-value="initialData.headcountGap" disabled />
          </BaseFormField>
        </template>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.responsibilities"
      :title="t('hr.jobPositions.form.responsibilities')"
      :summary="[t('hr.jobPositions.form.responsibilityCount', draft.responsibilities.length)]"
    >
      <div class="xl:col-span-2 space-y-1">
        <FormTextarea v-model="responsibilitiesText" :rows="6" :disabled="disabled" />
        <p class="text-xs text-muted-foreground">
          {{ t('hr.jobPositions.form.responsibilitiesHint') }}
        </p>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
