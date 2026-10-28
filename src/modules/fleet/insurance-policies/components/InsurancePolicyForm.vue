<script lang="ts" setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm, type FormValidationError } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { addDays, addMonths } from '@/utils/date'
import { formatDate } from '@/utils/format'
import { policyIssues } from '../domain/insurancePolicy'
import type { InsurancePolicyApi, InsuranceCoverage } from '../types/insurancePolicy.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<InsurancePolicyApi>
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
    vehicleNo: '',
    insurerNo: '',
    policyNumber: '',
    coverage: 'third_party' as InsuranceCoverage,
    startDate: '',
    endDate: '',
    annualPremium: null as number | null,
    deductible: null as number | null
  }),
  required: ['vehicleNo', 'insurerNo', 'policyNumber', 'coverage', 'startDate', 'endDate'],
  labelOf: (field) => t(`fleet.insurancePolicies.form.${field}`),
  validate: (values) =>
    values.startDate && values.endDate
      ? policyIssues({ ...values, terminatedOn: null }).map(
          (issue): FormValidationError => ({
            fieldKey: 'endDate',
            label: t(`fleet.insurancePolicies.issue.${issue}`)
          })
        )
      : []
})

/** A policy usually runs for a year: the end date follows a new start date. */
watch(
  () => draft.startDate,
  (startDate) => {
    if (props.isNew && startDate && !draft.endDate) {
      draft.endDate = addDays(addMonths(startDate, 12), -1)
    }
  }
)

const expandedSections = ref({ general: true, period: true, termination: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: {
    vehicleNo: 'general',
    insurerNo: 'general',
    policyNumber: 'general',
    coverage: 'general',
    startDate: 'period',
    endDate: 'period'
  },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('fleet.insurancePolicies.form.general')"
      :summary="[draft.policyNumber]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="vehicleNo"
          :label="t('fleet.insurancePolicies.form.vehicleNo')"
          :required="isRequired('vehicleNo')"
        >
          <ReferenceLookup
            v-model="draft.vehicleNo"
            reference-key="vehicles"
            :modal-title="t('fleet.insurancePolicies.form.vehicleNo')"
            detail-path="/fleet/vehicles"
            :disabled="disabled"
            :invalid="hasValidationError('vehicleNo')"
          />
        </BaseFormField>
        <BaseFormField
          field="insurerNo"
          :label="t('fleet.insurancePolicies.form.insurerNo')"
          :required="isRequired('insurerNo')"
        >
          <ReferenceLookup
            v-model="draft.insurerNo"
            reference-key="insurers"
            :modal-title="t('fleet.insurancePolicies.form.insurerNo')"
            detail-path="/fleet/providers"
            :disabled="disabled"
            :invalid="hasValidationError('insurerNo')"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="policyNumber"
          :label="t('fleet.insurancePolicies.form.policyNumber')"
          :required="isRequired('policyNumber')"
        >
          <FormInput
            v-model="draft.policyNumber"
            :maxlength="40"
            :disabled="disabled"
            :invalid="hasValidationError('policyNumber')"
          />
        </BaseFormField>
        <BaseFormField
          field="coverage"
          :label="t('fleet.insurancePolicies.form.coverage')"
          :required="isRequired('coverage')"
        >
          <OptionsSelect
            :model-value="draft.coverage"
            options-key="insuranceCoverage"
            :disabled="disabled"
            :invalid="hasValidationError('coverage')"
            @update:model-value="draft.coverage = String($event) as InsuranceCoverage"
          />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.period"
      :title="t('fleet.insurancePolicies.form.period')"
      :summary="[]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="startDate"
          :label="t('fleet.insurancePolicies.form.startDate')"
          :required="isRequired('startDate')"
        >
          <DateFormInput
            v-model="draft.startDate"
            :disabled="disabled"
            :invalid="hasValidationError('startDate')"
          />
        </BaseFormField>
        <BaseFormField
          field="endDate"
          :label="t('fleet.insurancePolicies.form.endDate')"
          :required="isRequired('endDate')"
        >
          <DateFormInput
            v-model="draft.endDate"
            :disabled="disabled"
            :invalid="hasValidationError('endDate')"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.insurancePolicies.form.annualPremium')">
          <FormInput v-model="draft.annualPremium" type="number" :min="0" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField :label="t('fleet.insurancePolicies.form.deductible')">
          <FormInput v-model="draft.deductible" type="number" :min="0" :disabled="disabled" />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-if="initialData.terminatedOn"
      v-model:open="expandedSections.termination"
      :title="t('fleet.insurancePolicies.form.termination')"
      :summary="[formatDate(initialData.terminatedOn)]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.insurancePolicies.form.terminatedOn')">
          <FormInput :model-value="formatDate(initialData.terminatedOn)" disabled />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.insurancePolicies.form.terminationReason')">
          <p class="text-sm text-card-foreground">{{ initialData.terminationReason }}</p>
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
