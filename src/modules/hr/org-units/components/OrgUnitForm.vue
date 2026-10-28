<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { useReferenceStore } from '@/stores/referenceStore'
import { CODE_MAX_LENGTH, isValidCode } from '@/utils/code'
import { formatDateTime } from '@/utils/format'
import { descendantNos } from '../domain/orgTree'
import type { OrgUnitApi } from '../types/orgUnit.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<OrgUnitApi>
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
const referenceStore = useReferenceStore()

/** The top of the structure has no parent; every other unit needs one. */
const isRoot = computed(() => !props.isNew && props.initialData.parentNo === null)

const { draft, isRequired, expose } = useEntityForm({
  initialData: () => props.initialData,
  empty: () => ({
    no: '',
    name: '',
    type: 'department',
    parentNo: '',
    managerNo: '',
    siteCode: '',
    description: ''
  }),
  createOnly: ['no'],
  required: () =>
    isRoot.value
      ? (['no', 'name', 'type', 'siteCode'] as const)
      : (['no', 'name', 'type', 'parentNo', 'siteCode'] as const),
  labelOf: (field) => t(`hr.orgUnits.form.${field}`),
  validate: (values) =>
    values.no && !isValidCode(values.no)
      ? [{ fieldKey: 'no', label: t('common.validation.codeFormat') }]
      : []
})

/** A unit cannot move under itself or one of its sub-units. */
const excludedParents = computed(() => {
  const no = props.initialData.no
  if (!no) return []
  const units = referenceStore
    .getItems('orgUnits')
    .map((item) => ({ no: item.code, parentNo: item.parentCode ?? null }))
  return [no, ...descendantNos(units, no)]
})

const expandedSections = ref({ general: true, validation: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: {
    no: 'general',
    name: 'general',
    type: 'general',
    parentNo: 'general',
    siteCode: 'general'
  },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('hr.orgUnits.form.general')"
      :summary="[draft.no, draft.name]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField field="no" :label="t('hr.orgUnits.form.no')" :required="isNew">
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
          :label="t('hr.orgUnits.form.name')"
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
          field="type"
          :label="t('hr.orgUnits.form.type')"
          :required="isRequired('type')"
        >
          <OptionsSelect
            :model-value="draft.type"
            options-key="orgUnitType"
            :disabled="disabled"
            :invalid="hasValidationError('type')"
            @update:model-value="draft.type = String($event)"
          />
        </BaseFormField>
        <BaseFormField
          field="parentNo"
          :label="t('hr.orgUnits.form.parentNo')"
          :required="isRequired('parentNo')"
        >
          <FormInput
            v-if="isRoot"
            :model-value="t('hr.orgUnits.form.root')"
            disabled
            show-lock-icon
          />
          <ReferenceLookup
            v-else
            v-model="draft.parentNo"
            reference-key="orgUnits"
            :modal-title="t('hr.orgUnits.form.parentNo')"
            detail-path="/hr/org-units"
            :exclude-codes="excludedParents"
            :disabled="disabled"
            :invalid="hasValidationError('parentNo')"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('hr.orgUnits.form.managerNo')">
          <ReferenceLookup
            v-model="draft.managerNo"
            reference-key="employees"
            :modal-title="t('hr.orgUnits.form.managerNo')"
            detail-path="/hr/employees"
            :disabled="disabled"
          />
        </BaseFormField>
        <BaseFormField
          field="siteCode"
          :label="t('hr.orgUnits.form.siteCode')"
          :required="isRequired('siteCode')"
        >
          <ReferenceLookup
            v-model="draft.siteCode"
            reference-key="sites"
            :modal-title="t('hr.orgUnits.form.siteCode')"
            detail-path="/fleet/sites"
            :disabled="disabled"
            :invalid="hasValidationError('siteCode')"
          />
        </BaseFormField>
        <BaseFormField :label="t('hr.orgUnits.form.description')">
          <FormTextarea
            v-model="draft.description"
            :rows="3"
            :maxlength="300"
            :disabled="disabled"
          />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-if="!isNew"
      v-model:open="expandedSections.validation"
      :title="t('hr.orgUnits.form.validation')"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('hr.orgUnits.form.status')">
          <OrgUnitStatusPill v-if="initialData.status" :status="initialData.status" />
        </BaseFormField>
        <BaseFormField :label="t('hr.orgUnits.form.submittedAt')">
          <FormInput :model-value="formatDateTime(initialData.submittedAt)" disabled />
        </BaseFormField>
        <BaseFormField :label="t('hr.orgUnits.form.validatedAt')">
          <FormInput :model-value="formatDateTime(initialData.validatedAt)" disabled />
        </BaseFormField>
        <BaseFormField :label="t('hr.orgUnits.form.validatedBy')">
          <FormInput :model-value="initialData.validatedBy" disabled />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('hr.orgUnits.form.headcount')">
          <FormInput :model-value="initialData.headcount" disabled />
        </BaseFormField>
        <BaseFormField :label="t('hr.orgUnits.form.totalHeadcount')">
          <FormInput :model-value="initialData.totalHeadcount" disabled />
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
