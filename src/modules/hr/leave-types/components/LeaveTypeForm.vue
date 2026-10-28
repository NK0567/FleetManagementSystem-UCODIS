<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { CODE_MAX_LENGTH, isValidCode } from '@/utils/code'
import { ANNUAL_LEAVE_TYPE_NO, type LeaveTypeApi } from '../types/leaveType.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<LeaveTypeApi>
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
    color: '#6b7280',
    statutory: false,
    active: true,
    paid: true,
    requiresDocument: false,
    annualEntitlementDays: null as number | null,
    monthlyAccrualDays: null as number | null,
    maxCarryOverDays: null as number | null,
    noticeDays: 0,
    tracksBalance: false,
    comment: ''
  }),
  createOnly: ['no', 'statutory'],
  required: ['no', 'name'],
  labelOf: (field) => t(`hr.leaveTypes.form.${field}`),
  validate: (values) =>
    values.no && !isValidCode(values.no)
      ? [{ fieldKey: 'no', label: t('common.validation.codeFormat') }]
      : []
})

const isAnnualLeave = computed(() => draft.no.toUpperCase() === ANNUAL_LEAVE_TYPE_NO)

const expandedSections = ref({ general: true, entitlement: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: { no: 'general', name: 'general' },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('hr.leaveTypes.form.general')"
      :summary="[draft.no, draft.name]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField field="no" :label="t('hr.leaveTypes.form.no')" :required="isNew">
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
          :label="t('hr.leaveTypes.form.name')"
          :required="isRequired('name')"
        >
          <FormInput
            v-model="draft.name"
            :maxlength="60"
            :disabled="disabled"
            :invalid="hasValidationError('name')"
          />
        </BaseFormField>
        <BaseFormField :label="t('hr.leaveTypes.form.color')">
          <input
            v-model="draft.color"
            type="color"
            class="h-9 w-16 border border-border rounded bg-card disabled:cursor-not-allowed"
            :disabled="disabled"
          />
        </BaseFormField>
        <BaseFormField :label="t('hr.leaveTypes.form.comment')">
          <FormInput v-model="draft.comment" :maxlength="200" :disabled="disabled" />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('hr.leaveTypes.form.statutory')">
          <ToggleSwitch v-model="draft.statutory" :disabled="disabled || !isNew" />
        </BaseFormField>
        <BaseFormField :label="t('hr.leaveTypes.form.active')">
          <ToggleSwitch v-model="draft.active" :disabled="disabled || draft.statutory" />
        </BaseFormField>
        <BaseFormField :label="t('hr.leaveTypes.form.paid')">
          <ToggleSwitch v-model="draft.paid" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField :label="t('hr.leaveTypes.form.requiresDocument')">
          <ToggleSwitch v-model="draft.requiresDocument" :disabled="disabled" />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.entitlement"
      :title="t('hr.leaveTypes.form.entitlement')"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('hr.leaveTypes.form.annualEntitlementDays')">
          <FormInput
            v-model="draft.annualEntitlementDays"
            type="number"
            :min="0"
            :disabled="disabled || isAnnualLeave"
          />
          <p v-if="isAnnualLeave" class="text-xs text-muted-foreground mt-1">
            {{ t('hr.leaveTypes.form.annualLeaveHint') }}
          </p>
        </BaseFormField>
        <BaseFormField :label="t('hr.leaveTypes.form.monthlyAccrualDays')">
          <FormInput
            v-model="draft.monthlyAccrualDays"
            type="number"
            :min="0"
            step="0.5"
            :disabled="disabled"
          />
        </BaseFormField>
        <BaseFormField :label="t('hr.leaveTypes.form.maxCarryOverDays')">
          <FormInput v-model="draft.maxCarryOverDays" type="number" :min="0" :disabled="disabled" />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('hr.leaveTypes.form.noticeDays')">
          <FormInput v-model="draft.noticeDays" type="number" :min="0" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField :label="t('hr.leaveTypes.form.tracksBalance')">
          <ToggleSwitch v-model="draft.tracksBalance" :disabled="disabled" />
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
